///<reference types="vss-web-extension-sdk" />

//import * as Control from "VSS/Controls";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as workRestClient from "TFS/Work/RestClient";
import * as coreRestClient from "TFS/Core/RestClient";
import { Dialog, MessageDialog, MessageDialogButtons } from "VSS/Controls/Dialogs";
// import * as Q from "Q";
// import * as StatusIndicator from "VSS/Controls/StatusIndicator";
//import * as Dialogs from "VSS/Controls/Dialogs";
import { TemplateType, WorkItemType, WorkItem } from "TFS/WorkItemTracking/Contracts";
import { FieldType, TeamSetting, TeamFieldValues } from "TFS/Work/Contracts";
import { buttonKeydownHandler } from "VSS/Utils/UI";
// import * as Contracts from "VSS/WebApi/Contracts";

    var ctx = null;

    var targetProjectName = "DSD";
   
    function WriteLog(msg) {
        console.log('Create-Child-Links: ' + msg);
    }

    function ShowErrorMessage(message, title = "Une erreur est survenue"){
      // alert(message);

      VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService : IHostDialogService) {
        // var extensionCtx = VSS.getExtensionContext();

        // Show dialog
        var dialogOptions : IOpenMessageDialogOptions = {
            title: title,
            width: 425,
            height: 175,
            useBowtieStyle: true, 
            buttons:  [dialogService.buttons.ok]
        };

        dialogService.openMessageDialog(message, dialogOptions);
      })
    }

    function getWorkItemFormService() {
      return _WorkItemServices.WorkItemFormService.getService();
    }

    function IsPropertyValid(taskTemplate, key) {
      if (taskTemplate.fields.hasOwnProperty(key) == false) {
          return false;
      }
      if (key.indexOf('System.Tags') >= 0) { //not supporting tags for now
          return false;
      }

      return true;
  }

    function createWorkItemFromTemplate(currentWorkItem: WorkItem, taskTemplate : WorkItemType,  teamSettings : TeamSetting, teamAreaPath: string, newWorkItemInfo) {
        var workItem = [];

        // for (var key in taskTemplate.fields) {
        //     if (IsPropertyValid(taskTemplate, key)) {
        //         //if field value is empty copies value from parent
        //         if(taskTemplate != undefined && (taskTemplate.fieldInstances[key].defaultValue == '' || taskTemplate.fieldInstances[key].defaultValue == null)){
        //             if (currentWorkItem[taskTemplate.fieldInstances[key].referenceName] != null) {
        //                 workItem.push({ "op": "add", "path": "/fields/" + taskTemplate.fieldInstances[key].referenceName, "value": currentWorkItem[taskTemplate.fieldInstances[key].referenceName] })
        //             }
        //         }
        //         else {
        //             var fieldValue = taskTemplate.fieldInstances[key];
        //             workItem.push({ "op": "add", "path": "/fields/" + fieldValue.referenceName, "value": fieldValue.defaultValue })
        //         }
        //     }
        // }

        // if template has no title field copies value from parent
        //if (taskTemplate.fields['System.Title'] == null)
            workItem.push({ "op": "add", "path": "/fields/System.Title", "value": newWorkItemInfo['System.Title'] })

        //if (taskTemplate.fields['System.History'] == null)
            workItem.push({ "op": "add", "path": "/fields/System.History", "value": newWorkItemInfo['System.Comment'] })

        // if template has no AreaPath field copies value from parent
        //if (taskTemplate.fieldInstances.find(f => { return f.referenceName == "System.AreaPath"; }) != undefined)
            {workItem.push({ "op": "add", "path": "/fields/System.AreaPath", "value": teamAreaPath });}

        // if template has no IterationPath field copies value from parent
        // check if IterationPath field value is @currentiteration
        // if (taskTemplate.fields['System.IterationPath'] == null)
        //     workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": currentWorkItem['System.IterationPath'] })
        // else if (taskTemplate.fields['System.IterationPath'].toLowerCase() == '@currentiteration')
            workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name + teamSettings.defaultIteration.path })
            //workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name })

            if(taskTemplate != undefined && taskTemplate.fieldInstances.find(f => { return f.referenceName == "Custom.Application"; }) != undefined){
              if(currentWorkItem["Custom.Application"] != undefined) {
                // ajout du code de code de system. si code systeme fournis sinon on pousse le nom du projet
                workItem.push({ "op": "add", "path": "/fields/Custom.Application", "value": currentWorkItem["Custom.Application"] })
              } else {
                workItem.push({ "op": "add", "path": "/fields/Custom.Application", "value": ctx.project.name })
              }
            } else {
              workItem.push({ "op": "add", "path": "/fields/System.Description", "value": ctx.project.name })
            }
              
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
      teamSettings: TeamSetting,
      targetTeam,
      targetTeamSettings: TeamSetting,
      teamAreaPath: string,
      newWorkItemInfo
    ) {
      var witClient = _WorkItemRestClient.getClient();

      witClient
              .getWorkItemType(targetTeam.project, newWorkItemInfo.witType)
              .then(function(witType : WorkItemType) {
                  var newWorkItem = createWorkItemFromTemplate(
                    currentWorkItem,
                    witType,
                    targetTeamSettings,
                    teamAreaPath,
                    newWorkItemInfo
                  );

                  console.log("WIT to create :", newWorkItem, targetTeam, targetTeamSettings, newWorkItemInfo);
                  witClient
                    .createWorkItem(
                      newWorkItem,
                      targetTeam.project,
                      witType.name
                    )
                    .then(function(response) {
                      //console.log("Response : ", response);
            
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
                    }, function(reason) {
                      ShowErrorMessage("La demande de soutien DSD n'a pas pu être créé.")
                      console.log("Erreur de création de demande : ", reason);
                    });
              }, function(reason) {
                ShowErrorMessage("Une erreur est survenue pour charger le type dans le projet d'équipe.")
                console.log("Erreur de chargement de type : ", reason);
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
          }, function(reason) {
            ShowErrorMessage("L'équipe de projet n'a pas été trouvé.")
            console.log("Erreur de chargement d'équipe : ", reason);
          });

        }, function(reason) {
          ShowErrorMessage("Le projet n'a pas été trouvé.")
          console.log("Erreur de chargement de projet : ", reason);
        });

        workClient.getTeamSettings(team)
                .then(function (teamSettings: TeamSetting) {

                  workClient.getTeamFieldValues(targetTeam).then(function(teamFields: TeamFieldValues){
                    return teamFields.defaultValue;
                  }).then(function(teamAreaPath){
                    workClient.getTeamSettings(targetTeam).then(function(targetTeamSettings) {
                      // Get the current values for a few of the common fields
                      witClient.getWorkItem(context.workItemId)
                          .then(function (value) {
                              var currentWorkItem = value.fields;
  
                              currentWorkItem['System.Id'] = context.workItemId;
  
                              getWorkItemFormService().then(function (service) {
                                createWorkItem(service, currentWorkItem,  teamSettings, targetTeam, targetTeamSettings, teamAreaPath, newWorkItemInfo);
                              });
  
                          })
                    }, function(reason) {
                      ShowErrorMessage("Les configuration de l'équipe n'as pas été chargé.")
                      console.log("Erreur de chargement de configuration d'équipe : ", reason);    
                    });
                  });
                }, function(reason) {
                  ShowErrorMessage("Les configuration de l'équipe n'as pas été chargé.")
                  console.log("Erreur de chargement de configuration d'équipe : ", reason);
                })
      }
