///<reference types="vss-web-extension-sdk" />

//import * as Control from "VSS/Controls";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as workRestClient from "TFS/Work/RestClient";
import * as coreRestClient from "TFS/Core/RestClient";
// import { Dialog } from "VSS/Controls/Dialogs";
// import * as Q from "Q";
// import * as StatusIndicator from "VSS/Controls/StatusIndicator";
import * as Dialogs from "VSS/Controls/Dialogs";
// import * as Contracts from "VSS/WebApi/Contracts";



    var ctx = null;

    var targetProjectName = "DSD";
   
    function WriteLog(msg) {
        console.log('Create-Child-Links: ' + msg);
    }

    function getWorkItemFormService() {
      return _WorkItemServices.WorkItemFormService.getService();
    }

    function createWorkItemFromTemplate(currentWorkItem, teamSettings, newWorkItemInfo) {
        var workItem = [];

        // for (var key in taskTemplate.fields) {
        //     if (IsPropertyValid(taskTemplate, key)) {
        //         //if field value is empty copies value from parent
        //         if (taskTemplate.fields[key] == '') {
        //             if (currentWorkItem[key] != null) {
        //                 workItem.push({ "op": "add", "path": "/fields/" + key, "value": currentWorkItem[key] })
        //             }
        //         }
        //         else {
        //             var fieldValue = taskTemplate.fields[key];
        //             //check for references to parent fields - {fieldName}
        //             fieldValue = replaceReferenceToParentField(fieldValue, currentWorkItem);
                    
        //             workItem.push({ "op": "add", "path": "/fields/" + key, "value": fieldValue })
        //         }
        //     }
        // }

        // if template has no title field copies value from parent
        //if (taskTemplate.fields['System.Title'] == null)
            workItem.push({ "op": "add", "path": "/fields/System.Title", "value": newWorkItemInfo['System.Title'] })

        //if (taskTemplate.fields['System.History'] == null)
            workItem.push({ "op": "add", "path": "/fields/System.History", "value": newWorkItemInfo['System.Comment'] })

        // if template has no AreaPath field copies value from parent
        //if (taskTemplate.fields['System.AreaPath'] == null)
            //workItem.push({ "op": "add", "path": "/fields/System.AreaPath", "value": currentWorkItem['System.AreaPath'] })
            workItem.push({ "op": "add", "path": "/fields/System.AreaPath", "value": teamSettings.backlogIteration.name + "\\"+ newWorkItemInfo.Team })

        // if template has no IterationPath field copies value from parent
        // check if IterationPath field value is @currentiteration
        // if (taskTemplate.fields['System.IterationPath'] == null)
        //     workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": currentWorkItem['System.IterationPath'] })
        // else if (taskTemplate.fields['System.IterationPath'].toLowerCase() == '@currentiteration')
            workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name + teamSettings.defaultIteration.path })
            //workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name })

        // check if AssignedTo field value is @me
        // if (taskTemplate.fields['System.AssignedTo'] != null) {
        //     if (taskTemplate.fields['System.AssignedTo'].toLowerCase() == '@me') {
                // workItem.push({ "op": "add", "path": "/fields/System.AssignedTo", "value": ctx.user.uniqueName })
        //     }
        // }

        return workItem;
    }

    function createWorkItem(
      service,
      currentWorkItem,
      teamSettings,
      targetTeam,
      targetTeamSettings,
      newWorkItemInfo
    ) {
      var witClient = _WorkItemRestClient.getClient();

      var newWorkItem = createWorkItemFromTemplate(
        currentWorkItem,
        targetTeamSettings,
        newWorkItemInfo
      );

// VSS.getWebContext().project.name
      console.log("WIT to create :", newWorkItem, targetTeam, targetTeamSettings, newWorkItemInfo);
      witClient
        .createWorkItem(
          newWorkItem,
          targetTeam.project,
          newWorkItemInfo.witType
        )
        .then(function(response) {
          console.log("Response : ", response);

          //Add relation
          if (service != null) {
            service.addWorkItemRelations([
              {
                rel: newWorkItemInfo.linkType,
                url: response.url
              }
            ]);
            service.setFieldValue("System.History", newWorkItemInfo['System.Comment']);
            //Save
            service.beginSaveWorkItem(
              function(response) {
                WriteLog(" Saved");
              },
              function(error) {
                WriteLog(" Error saving: " + response);
              }
            );
          } else {
            //save using RestClient
            var workItemId = currentWorkItem["System.Id"];
            var document = [
              {
                op: "add",
                path: "/relations/-",
                value: {
                  rel: newWorkItemInfo.linkType,
                  url: response.url,
                  attributes: {
                    isLocked: false
                  }
                }
              },
              { "op": "add", "path": "/fields/System.History", "value": newWorkItemInfo['System.Comment'] }
            ];

            witClient
              .updateWorkItem(document, workItemId)
              .then(function(response) {
                var a = response;
                VSS.getService(VSS.ServiceIds.Navigation).then(function(
                  navigationService
                ) {
                  //navigationService.relaod();
                });
              });
          }
        });
    }

    export function create(context, newWorkItemInfo) {
        var witClient = _WorkItemRestClient.getClient();
        var workClient = workRestClient.getClient();

        ctx = VSS.getWebContext();

        var team = {
            project: ctx.project.name,
            projectId: ctx.project.id,
            teamId: ctx.team.id,
            team: ctx.team.name
        }

        var targetTeam = {
          project: targetProjectName,
          projectId: "",
          team: newWorkItemInfo.Team,
          teamId: newWorkItemInfo.TeamId
        }

        var coreClient = coreRestClient.getClient();
        coreClient.getProject(targetTeam.project).then(function(project) {
          targetTeam.project = project.name;
          targetTeam.projectId = project.id;

          coreClient.getTeam(project.id, newWorkItemInfo.TeamId).then(function(team){
            targetTeam.team = team.name;
            targetTeam.teamId = team.id;
          });

        });

        workClient.getTeamSettings(team)
                .then(function (teamSettings) {

                    workClient.getTeamSettings(targetTeam).then(function(targetTeamSettings) {

                      // Get the current values for a few of the common fields
                      witClient.getWorkItem(context.workItemId)
                          .then(function (value) {
                              var currentWorkItem = value.fields
  
                              currentWorkItem['System.Id'] = context.workItemId;
  
                              //console.log("currentWorkItem" , currentWorkItem);
  
                              getWorkItemFormService().then(function (service) {
                                createWorkItem(service, currentWorkItem,  teamSettings, targetTeam, targetTeamSettings, newWorkItemInfo);
                              });
  
                          })
                    });
                })

      }
