///<reference types="vss-web-extension-sdk" />

import * as _VSSServices from "VSS/Service";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as workRestClient from "TFS/Work/RestClient";
import * as coreRestClient from "TFS/Core/RestClient";
import * as Dialogs from "VSS/Controls/Dialogs";
import {
  TemplateType,
  WorkItemType,
  WorkItemTypeTemplate,
  WorkItemTypeCategory,
  WorkItem
} from "TFS/WorkItemTracking/Contracts";
import { FieldType, TeamSetting, TeamFieldValues, BacklogConfiguration } from "TFS/Work/Contracts";
import { buttonKeydownHandler } from "VSS/Utils/UI";
import {
  TeamProject,
  WebApiTeam,
  TeamProjectCollectionReference
} from "TFS/Core/Contracts";

interface TeamSettingInfo {
  project: string;
  projectId: string;
  team: string;
  teamId: string;
}

var ctx: WebContext = null;

function WriteLog(msg: any, ...optionalparams: any[]) {
  console.log("Create-Child-Links: ", msg, optionalparams);
}

function ShowErrorMessage(message, title = "Une erreur est survenue") {
  // alert(message);

  VSS.getService(VSS.ServiceIds.Dialog).then(function(
    dialogService: IHostDialogService
  ) {
    // var extensionCtx = VSS.getExtensionContext();

    // Show dialog
    var dialogOptions: IOpenMessageDialogOptions = {
      title: title,
      width: 425,
      height: 175,
      useBowtieStyle: true,
      buttons: [dialogService.buttons.ok]
    };

    dialogService.openMessageDialog(message, dialogOptions);
  });
}

function getWorkItemFormService() {
  return _WorkItemServices.WorkItemFormService.getService();
}

function createWorkItem(
  service: _WorkItemServices.IWorkItemFormService,
  currentWorkItem,
  currentWorkItemFields,
  teamSettings: TeamSetting,
  targetTeam: TeamSettingInfo,
  targetTeamSettings: TeamSetting,
  teamAreaPath: string,
  newWorkItemInfo
) {
  var witClient = _WorkItemRestClient.getClient();

  witClient.getWorkItemType(targetTeam.project, newWorkItemInfo.witType).then(
    function(witType: WorkItemType) {
      // console.log(
      //   "WIT to create :",
      //   witType,
      //   targetTeam,
      //   targetTeamSettings,
      //   newWorkItemInfo
      // );

      var newCTX: WebContext = VSS.getWebContext();
      newCTX.project.id = targetTeam.projectId;
      newCTX.project.name = targetTeam.project;
      newCTX.team.id = targetTeam.teamId;
      newCTX.team.name = targetTeam.team;

      VSS.getService(
        _WorkItemServices.WorkItemFormNavigationService.contributionId,
        newCTX
      ).then(function(
        workItemNavSvc: _WorkItemServices.IWorkItemFormNavigationService
      ) {
        var newWITParams = createNewWITParam(witType);

        workItemNavSvc.openNewWorkItem(witType.name, newWITParams).then(
          function(newWIT) {
            if (newWIT != null) {
              AddRelationToCurrentWorkItem(
                newWIT,
                service,
                newWorkItemInfo,
                witClient,
                currentWorkItem
              );
            }
          },
          function(reason) {
            console.log("Une erreur de création de la fenêtre de WIT", reason);

            var newWorkItem = createWorkItemFromTemplate(
              currentWorkItem,
              currentWorkItemFields,
              witType,
              targetTeamSettings,
              teamAreaPath,
              newWorkItemInfo
            );

            witdCreateWorkItem(service, newWorkItem, witType);
          }
        );
      });
    },
    function(reason) {
      ShowErrorMessage(
        "Une erreur est survenue pour charger le type dans le projet d'équipe."
      );
      console.log("Erreur de chargement de type : ", reason);
    }
  );

  function createWorkItemFromTemplate(
    currentWorkItem: WorkItem,
    currentWorkItemFields,
    taskTemplate: WorkItemType,
    teamSettings: TeamSetting,
    teamAreaPath: string,
    newWorkItemInfo
  ) {
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
    workItem.push({
      op: "add",
      path: "/fields/System.Title",
      value: newWorkItemInfo["System.Title"]
    });

    //if (taskTemplate.fields['System.History'] == null)
    workItem.push({
      op: "add",
      path: "/fields/System.History",
      value: newWorkItemInfo["System.Comment"]
    });

    workItem.push({
      op: "add",
      path: "/fields/System.Description",
      value: newWorkItemInfo["System.Description"]
    });

    // if template has no AreaPath field copies value from parent
    //if (taskTemplate.fieldInstances.find(f => { return f.referenceName == "System.AreaPath"; }) != undefined)
    // {
      workItem.push({
        op: "add",
        path: "/fields/System.AreaPath",
        value: teamAreaPath
      });
    // }

    workItem.push({
        op: "add",
        path: "/fields/System.IterationPath",
        value: newWorkItemInfo["System.IterationPath"]
    });

    console.log(" newWorkItemInfo[System.IterationPath]", newWorkItemInfo);



    // if template has no IterationPath field copies value from parent
    // check if IterationPath field value is @currentiteration
    // if (taskTemplate.fields['System.IterationPath'] == null)
    //     workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": currentWorkItem['System.IterationPath'] })
    // else if (taskTemplate.fields['System.IterationPath'].toLowerCase() == '@currentiteration')
    // workItem.push({
    //   op: "add",
    //   path: "/fields/System.IterationPath",
    //   value:
    //     teamSettings.backlogIteration.name + teamSettings.defaultIteration.path
    // });
    //workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name })

    // var myCustomApplicationField = undefined;
    // for (let i=0; i< taskTemplate.fieldInstances.length; i++) {
    //   if(taskTemplate.fieldInstances[i].referenceName == "Custom.Application") {
    //     myCustomApplicationField = taskTemplate.fieldInstances[i];
    //     break;
    //   }
    // }

    // if (
    //   taskTemplate != undefined && myCustomApplicationField != undefined
    //   // taskTemplate.fieldInstances.find(f => {
    //   //   return f.referenceName == "Custom.Application";
    //   // }) != undefined
    // ) {
    //   if (currentWorkItem["Custom.Application"] != undefined) {
    //     // ajout du code de code de system. si code systeme fournis sinon on pousse le nom du projet
    //     workItem.push({
    //       op: "add",
    //       path: "/fields/Custom.Application",
    //       value: currentWorkItem["Custom.Application"]
    //     });
    //   } else {
    //     workItem.push({
    //       op: "add",
    //       path: "/fields/Custom.Application",
    //       value: ctx.project.name
    //     });
    //   }
    // } 

    workItem.push({
      op: "add",
      path: "/relations/-",
      value: {
        rel: newWorkItemInfo.linkType,
        url: currentWorkItem.url,
        attributes: {
          isLocked: false
        }
      }
    });

    // check if AssignedTo field value is @me
    // if (taskTemplate.fields['System.AssignedTo'] != null) {
    //     if (taskTemplate.fields['System.AssignedTo'].toLowerCase() == '@me') {
    //        workItem.push({ "op": "add", "path": "/fields/System.AssignedTo", "value": ctx.user.uniqueName })
    //     }
    // }

    return workItem;
  }

  function witdCreateWorkItem(
    service: _WorkItemServices.IWorkItemFormService,
    newWorkItem,
    witType: WorkItemType
  ): WorkItem {
    let myWIT: WorkItem;
    witClient
      .createWorkItem(newWorkItem, targetTeam.project, witType.name)
      .then(
        function(response: WorkItem) {
          //Add relation
          if (service != null) {
            service.addWorkItemRelations([
              {
                rel: newWorkItemInfo.linkType,
                url: response.url,
                attributes: {
                  isLocked: false
                }
              }
            ]);

            service.setFieldValue(
              "System.History",
              newWorkItemInfo["System.Comment"]
            );

          } else {
            //save using RestClient
            var workItemId = currentWorkItemFields["System.Id"];
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
              {
                op: "add",
                path: "/fields/System.History",
                value: newWorkItemInfo["System.Comment"]
              }
            ];

            witClient
              .updateWorkItem(document, workItemId)
              .then(function(response) {
                var a = response;
                VSS.getService(VSS.ServiceIds.Navigation).then(function(
                  navigationService: IHostNavigationService
                ) {
                  navigationService.reload();
                });
              });
            myWIT = response;
          }
        },
        function(reason) {
          console.log("Impossible de créer la demande de soutien :", reason);
        }
      )
      .then(function(response) {
        _WorkItemServices.WorkItemFormNavigationService.getService().then(
          function(workItemNavSvc) {
            workItemNavSvc.openWorkItem(myWIT.id, true);
          }
        );
      });

    return myWIT;
  }

  function createNewWITParam(witType: WorkItemType) {
    var newWITParams = {
      "System.Title": newWorkItemInfo["System.Title"],
      "System.AreaPath": teamAreaPath,
      "System.History": newWorkItemInfo["System.Comment"],
      "System.Description": newWorkItemInfo["System.Description"],
      "System.IterationPath": targetTeamSettings.backlogIteration.name,
      "System.TeamProject": targetTeam.project
    };

    //      "System.IterationPath": targetTeamSettings.backlogIteration.name,

    if (targetTeamSettings.defaultIteration != undefined && targetTeamSettings.defaultIteration.path != undefined)
    { 
      // On crée dans l'itération par defaut, on ne crée pas au niveau du backlog
      newWITParams["System.IterationPath"] = targetTeamSettings.defaultIteration.path;
    }

    console.log("createNewWITParam iteration : ", newWITParams["System.IterationPath"]);

    // var myCustomApplicationField = undefined;
    // for (let i=0; i< witType.fieldInstances.length; i++) {
    //   if(witType.fieldInstances[i].referenceName == "Custom.Application") {
    //     myCustomApplicationField = witType.fieldInstances[i];
    //     break;
    //   }
    // }

    // if (
    //   witType != undefined && myCustomApplicationField != undefined
    //   // witType.fieldInstances.find(f => {
    //   //   return f.referenceName == "Custom.Application";
    //   // }) != undefined
    // ) {
    //   if (currentWorkItem["Custom.Application"] != undefined) {
    //     // ajout du code de code de system. si code systeme fournis sinon on pousse le nom du projet
    //     newWITParams["Custom.Application"] =
    //       currentWorkItem["Custom.Application"];
    //   } else {
    //     newWITParams["Custom.Application"] = ctx.project.name;
    //   }
    // } 
    return newWITParams;
  }
}

function AddRelationToCurrentWorkItem(
  newWIT: WorkItem,
  service: _WorkItemServices.IWorkItemFormService,
  newWorkItemInfo: any,
  witClient: _WorkItemRestClient.WorkItemTrackingHttpClient4_1,
  currentWorkItem: any
) {
  //Add relation
  if (service != null) {
    service.hasActiveWorkItem().then(function(hasActiveWorkItem: boolean) {
      if(hasActiveWorkItem) {
        service.addWorkItemRelations([
          {
            rel: newWorkItemInfo.linkType,
            url: newWIT.url,
            attributes: {
              isLocked: false
            }
          }
        ]);
        service.setFieldValue("System.History", newWorkItemInfo["System.Comment"]);
        // service.setFieldValue("System.Description", newWorkItemInfo["System.Description"]);
        //Save
        service.save().then(
          function(response) {
            WriteLog(" Sauvegarde à partir du service: ", response);
          },
          function(error) {
            WriteLog(" Erreur de sauvegarde: ", newWIT);
          }
        );   

      } else {
        AddRelationToCurrentWorkItemJSon(newWIT,
          service,
          newWorkItemInfo,
          witClient,
          currentWorkItem);
      }
    }, function(reason:any) {
      WriteLog("Failed to get the current work item service:", reason);
      AddRelationToCurrentWorkItemJSon(newWIT,
        service,
        newWorkItemInfo,
        witClient,
        currentWorkItem);
    });
  } 
}

function AddRelationToCurrentWorkItemJSon(
  newWIT: WorkItem,
  service: _WorkItemServices.IWorkItemFormService,
  newWorkItemInfo: any,
  witClient: _WorkItemRestClient.WorkItemTrackingHttpClient4_1,
  currentWorkItem: any
) {
  var jsondoc = [
    {
      op: "add",
      path: "/relations/-",
      value: {
        rel: newWorkItemInfo.linkType,
        url: newWIT.url,
        attributes: {
          isLocked: false
        }
      }
    },
    {
      op: "add",
      path: "/fields/System.History",
      value: newWorkItemInfo["System.Comment"]
    }
  ];

  witClient
    .updateWorkItem(jsondoc, currentWorkItem.id)
    .then(function(response) {
      VSS.getService(VSS.ServiceIds.Navigation).then(function(
        navigationService: IHostNavigationService
      ) {
        navigationService.reload();
      });
      WriteLog("Work item updated via JSON", response);
    }, function(reason) {
      WriteLog("Failed to save work item via json", reason)
    });
}

export function create(context, newWorkItemInfo) {
  var witClient = _WorkItemRestClient.getClient();
  var workClient = workRestClient.getClient();

  ctx = VSS.getWebContext();

  var team: TeamSettingInfo = {
    project: ctx.project.name,
    projectId: ctx.project.id,
    teamId: ctx.team.id,
    team: ctx.team.name
  };

  var targetTeam: TeamSettingInfo = {
    project: newWorkItemInfo.Project,
    projectId: newWorkItemInfo.ProjectId,
    team: newWorkItemInfo.Team,
    teamId: newWorkItemInfo.TeamId
  };

  var coreClient = coreRestClient.getClient();
  coreClient.getProject(targetTeam.project).then(
    function(project: TeamProject) {
      targetTeam.project = project.name;
      targetTeam.projectId = project.id;

      coreClient.getTeam(project.id, newWorkItemInfo.TeamId).then(
        function(myTeam: WebApiTeam) {
          targetTeam.team = myTeam.name;
          targetTeam.teamId = myTeam.id;
        },
        function(reason) {
          ShowErrorMessage("L'équipe de projet n'a pas été trouvé.");
          console.log("Erreur de chargement d'équipe : ", reason);
        }
      );
    },
    function(reason) {
      ShowErrorMessage("Le projet n'a pas été trouvé.");
      console.log("Erreur de chargement de projet : ", reason);
    }
  );

  workClient.getTeamSettings(team).then(
    function(teamSettings: TeamSetting) {
      workClient
        .getTeamFieldValues(targetTeam)
        .then(function(teamFields: TeamFieldValues) {
          return teamFields.defaultValue;
        })
        .then(function(teamAreaPath) {
          workClient.getTeamSettings(targetTeam).then(
            function(targetTeamSettings) {
              // Get the current values for a few of the common fields
              let currentContextWorkItemId = context.workItemId !== undefined ? context.workItemId : 
                                              context.id !== undefined ? context.id : context.workItemIds[0];

            

              workClient.getTeamIterations(targetTeam, "Current").then(function(iterations) {
                console.log("Iterations :", iterations);
                if(iterations.length > 0)
                  { targetTeamSettings.defaultIteration = iterations[0]; }
              }, 
              function(reason) {
                console.log("Could not lod iterations: ", reason);
              }).then(function() {
                witClient
                .getWorkItem(currentContextWorkItemId)
                .then(function(currentWorkItem) {
                  var currentWorkItemFields = currentWorkItem.fields;

                  currentWorkItemFields["System.Id"] = currentContextWorkItemId;

                  getWorkItemFormService().then(function(
                    service: _WorkItemServices.IWorkItemFormService
                  ) {
                    createWorkItem(
                      service,
                      currentWorkItem,
                      currentWorkItemFields,
                      teamSettings,
                      targetTeam,
                      targetTeamSettings,
                      teamAreaPath,
                      newWorkItemInfo
                    );
                  });
                });
              }, function(reason) {
                console.log("Could not finish processing getTEamIterations:", reason);
              });
            },
            function(reason) {
              ShowErrorMessage(
                "Les configuration de l'équipe n'as pas été chargé."
              );
              console.log(
                "Erreur de chargement de configuration d'équipe : ",
                reason
              );
            }
          );
        });
    },
    function(reason) {
      ShowErrorMessage("Les configuration de l'équipe n'as pas été chargé.");
      console.log("Erreur de chargement de configuration d'équipe : ", reason);
    }
  );
}
