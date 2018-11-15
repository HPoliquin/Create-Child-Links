///<reference types="vss-web-extension-sdk" />

//import * as Control from "VSS/Controls";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as workRestClient from "TFS/Work/RestClient";
// import * as Q from "Q";
// import * as StatusIndicator from "VSS/Controls/StatusIndicator";
// import * as Dialogs from "VSS/Controls/Dialogs";
// import * as Contracts from "VSS/WebApi/Contracts";



    var ctx = null;

    function ShowDialog(message) {

        var dialogOptions = {
            title: "Create-Child-Links",
            width: 300,
            height: 200,
            resizable: false,
        };

        VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogSvc) {

            // dialogSvc.openMessageDialog(message, dialogOptions)
            //     .then(function (dialog) {
            //         //
            //     }, function (dialog) {
            //         //
            //     });
        });
    }

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

        // if template has no AreaPath field copies value from parent
        //if (taskTemplate.fields['System.AreaPath'] == null)
            workItem.push({ "op": "add", "path": "/fields/System.AreaPath", "value": currentWorkItem['System.AreaPath'] })

        // if template has no IterationPath field copies value from parent
        // check if IterationPath field value is @currentiteration
        // if (taskTemplate.fields['System.IterationPath'] == null)
        //     workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": currentWorkItem['System.IterationPath'] })
        // else if (taskTemplate.fields['System.IterationPath'].toLowerCase() == '@currentiteration')
            workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name + teamSettings.defaultIteration.path })

        // check if AssignedTo field value is @me
        // if (taskTemplate.fields['System.AssignedTo'] != null) {
        //     if (taskTemplate.fields['System.AssignedTo'].toLowerCase() == '@me') {
                workItem.push({ "op": "add", "path": "/fields/System.AssignedTo", "value": ctx.user.uniqueName })
        //     }
        // }

        return workItem;
    }

    function createWorkItem(
      service,
      currentWorkItem,
      teamSettings,
      newWorkItemInfo
    ) {
      var witClient = _WorkItemRestClient.getClient();

      var newWorkItem = createWorkItemFromTemplate(
        currentWorkItem,
        teamSettings,
        newWorkItemInfo
      );


      witClient
        .createWorkItem(
          newWorkItem,
          VSS.getWebContext().project.name,
          newWorkItemInfo.witType
        )
        .then(function(response) {
          //Add relation
          if (service != null) {
            service.addWorkItemRelations([
              {
                rel: newWorkItemInfo.linkType,
                url: response.url
              }
            ]);
            //Save
            service.beginSaveWorkItem(
              function(response) {
                //WriteLog(" Saved");
              },
              function(error) {
                ShowDialog(" Error saving: " + response);
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
              }
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
        console.log("init toolbar code", context, newWorkItemInfo);

        var witClient = _WorkItemRestClient.getClient();
        var workClient = workRestClient.getClient();

        ctx = VSS.getWebContext();

        var team = {
            project: ctx.project.name,
            projectId: ctx.project.id,
            teamId: ctx.team.id,
            team: ctx.team.name
        }

        workClient.getTeamSettings(team)
                .then(function (teamSettings) {
                    // Get the current values for a few of the common fields
                    witClient.getWorkItem(context.workItemId)
                        .then(function (value) {
                            var currentWorkItem = value.fields

                            currentWorkItem['System.Id'] = context.workItemId;

                            var workItemType = currentWorkItem["System.WorkItemType"];

                            console.log("currentWorkItem" , currentWorkItem);

                            getWorkItemFormService().then(function (service) {
                              createWorkItem(service, currentWorkItem,  teamSettings, newWorkItemInfo);
                            });

                        })

                    
                })

        // getWorkItemFormService().then(function(service) {
        //   service.hasActiveWorkItem().then(function success(response) {
        //     if (response == true) {
        //       //form is open
        //       AddTasksOnForm(service);
        //     } else {
        //       // on grid
        //       if (context.workItemIds && context.workItemIds.length > 0) {
        //         context.workItemIds.forEach(function(workItemId) {
        //           AddTasksOnGrid(workItemId);
        //         });
        //       } else if (context.id) {
        //         var workItemId = context.id;
        //         AddTasksOnGrid(workItemId);
        //       }
        //     }
        //   });
        // });
      }
