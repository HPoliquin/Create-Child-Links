///<reference types="vss-web-extension-sdk" />

//import * as Control from "VSS/Controls";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as workRestClient from "TFS/Work/RestClient";
import * as coreRestClient from "TFS/Core/RestClient";
import {
  Dialog,
  MessageDialog,
  MessageDialogButtons,
  ModalDialog,
  IDialogOptions,
  IModalDialogOptions
} from "VSS/Controls/Dialogs";
// import * as Q from "Q";
// import * as StatusIndicator from "VSS/Controls/StatusIndicator";
//import * as Dialogs from "VSS/Controls/Dialogs";
import {
  TemplateType,
  WorkItemType,
  WorkItem
} from "TFS/WorkItemTracking/Contracts";
import { FieldType, TeamSetting, TeamFieldValues } from "TFS/Work/Contracts";
import { buttonKeydownHandler } from "VSS/Utils/UI";
import { VssService } from "VSS/Service";
import { TeamProject, WebApiTeam } from "TFS/Core/Contracts";
// import * as Contracts from "VSS/WebApi/Contracts";

interface TeamSettingInfo {
  project: string;
  projectId: string;
  team: string;
  teamId: string;
}

var ctx: WebContext = null;

var targetProjectName = "DSD";

function WriteLog(msg) {
  console.log("Create-Child-Links: " + msg);
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

function OpenCreateWITDialog(witType: WorkItemType, newWorkItemURI: string) {
  var createURI =
    ctx.host.uri +
    targetProjectName +
    "/_workItemns/create/" +
    encodeURIComponent(witType.name) +
    "?" +
    newWorkItemURI;
  VSS.getService(VSS.ServiceIds.Navigation).then(function(
    navSvc: IHostNavigationService
  ) {
    navSvc.openNewWindow(createURI, "");
  });
}

function OpenWITDialog(title: string, postContent) {
  console.log("Opening dialog of", postContent);

  // VSS.getService(VSS.ServiceIds.Navigation).then(function (navSvc : IHostNavigationService) {
  //    navSvc.openNewWindow("https://dev.azure.com/Cofomo-HPoliquin/DSD/_workItems/create/User%20Story?%5BSystem.Title%5D=sdfg&%5BSystem.IterationPath%5D=DSD%5CItération%201&%5BSystem.AreaPath%5D=DSD", "");
  // });

  VSS.getService(VSS.ServiceIds.Dialog).then(function(
    dialogService: IHostDialogService
  ) {
    var extensionCtx = VSS.getExtensionContext();

    var contibution = VSS.getContribution();

    // Show dialog
    var dialogOptions: IHostDialogOptions = {
      title: title || "Properties",
      width: 900,
      height: 700,
      buttons: [dialogService.buttons.ok, dialogService.buttons.cancel]
    };

    var contributionConfig = {
      url:
        "https://dev.azure.com/Cofomo-HPoliquin/DSD/_workItems/create/User%20Story"
    };

    dialogService.openDialog(
      "ms.vss-work-web.work-item-form",
      dialogOptions,
      contributionConfig,
      postContent
    );
  });
}

function getWorkItemFormService() {
  console.log(
    "Contribution id :",
    _WorkItemServices.WorkItemFormService.contributionId
  );
  return _WorkItemServices.WorkItemFormService.getService();
}

function IsPropertyValid(taskTemplate, key) {
  if (taskTemplate.fields.hasOwnProperty(key) == false) {
    return false;
  }
  if (key.indexOf("System.Tags") >= 0) {
    //not supporting tags for now
    return false;
  }

  return true;
}

// function createUriWorkItemFromTemplate(
//   currentWorkItem: WorkItem,
//   currentWorkItemFields,
//   taskTemplate: WorkItemType,
//   teamSettings: TeamSetting,
//   teamAreaPath: string,
//   newWorkItemInfo
// ) {
//   var workItemUri = "";
//   workItemUri += "[System.Title]=" + newWorkItemInfo["System.Title"];
//   workItemUri += "&[System.History]=" + newWorkItemInfo["System.Comment"];
//   workItemUri += "&[System.AreaPath]=" + teamAreaPath;
//   workItemUri +=
//     "&[System.IterationPath]=" +
//     teamSettings.backlogIteration.name +
//     teamSettings.defaultIteration.path;
//   workItemUri += "&[System.AreaPath]=" + teamAreaPath;

//   if (
//     taskTemplate != undefined &&
//     taskTemplate.fieldInstances.find(f => {
//       return f.referenceName == "Custom.Application";
//     }) != undefined
//   ) {
//     if (currentWorkItemFields["Custom.Application"] != undefined) {
//       // ajout du code de code de system. si code systeme fournis sinon on pousse le nom du projet
//       workItemUri +=
//         "&[Custom.Application]=" + currentWorkItemFields["Custom.Application"];
//     } else {
//       workItemUri += "&[Custom.Application]=" + ctx.project.name;
//     }
//   } else {
//     workItemUri += "&[System.Description]=" + ctx.project.name;
//   }
//   return encodeURIComponent(workItemUri);
// }

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

  // if template has no AreaPath field copies value from parent
  //if (taskTemplate.fieldInstances.find(f => { return f.referenceName == "System.AreaPath"; }) != undefined)
  {
    workItem.push({
      op: "add",
      path: "/fields/System.AreaPath",
      value: teamAreaPath
    });
  }

  // if template has no IterationPath field copies value from parent
  // check if IterationPath field value is @currentiteration
  // if (taskTemplate.fields['System.IterationPath'] == null)
  //     workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": currentWorkItem['System.IterationPath'] })
  // else if (taskTemplate.fields['System.IterationPath'].toLowerCase() == '@currentiteration')
  workItem.push({
    op: "add",
    path: "/fields/System.IterationPath",
    value:
      teamSettings.backlogIteration.name + teamSettings.defaultIteration.path
  });
  //workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name })

  if (
    taskTemplate != undefined &&
    taskTemplate.fieldInstances.find(f => {
      return f.referenceName == "Custom.Application";
    }) != undefined
  ) {
    if (currentWorkItem["Custom.Application"] != undefined) {
      // ajout du code de code de system. si code systeme fournis sinon on pousse le nom du projet
      workItem.push({
        op: "add",
        path: "/fields/Custom.Application",
        value: currentWorkItem["Custom.Application"]
      });
    } else {
      workItem.push({
        op: "add",
        path: "/fields/Custom.Application",
        value: ctx.project.name
      });
    }
  } else {
    workItem.push({
      op: "add",
      path: "/fields/System.Description",
      value: ctx.project.name
    });
  }

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
  // workItem.push({ "op": "add", "path": "/fields/System.AssignedTo", "value": ctx.user.uniqueName })
  //     }
  // }

  return workItem;
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
      var newWorkItem = createWorkItemFromTemplate(
        currentWorkItem,
        currentWorkItemFields,
        witType,
        targetTeamSettings,
        teamAreaPath,
        newWorkItemInfo
      );

      // var newWorkItemURI = createUriWorkItemFromTemplate(
      //   currentWorkItem,
      //   currentWorkItemFields,
      //   witType,
      //   targetTeamSettings,
      //   teamAreaPath,
      //   newWorkItemInfo
      // );

      console.log(
        "WIT to create :",
        witType,
        newWorkItem,
        targetTeam,
        targetTeamSettings,
        newWorkItemInfo
      );

      var newCTX = VSS.getWebContext();
      newCTX.project.id = targetTeam.projectId;
      newCTX.project.name = targetTeam.project;
      newCTX.team.id = targetTeam.teamId;
      newCTX.team.name = targetTeam.team;

      _WorkItemServices.WorkItemFormNavigationService.getService(newCTX).then(
        function(workItemNavSvc) {
          var newWITParams = {
            "System.Title": newWorkItemInfo["System.Title"],
            "System.AreaPath": teamAreaPath,
            "System.History": newWorkItemInfo["System.Comment"],
            "System.IterationPath":
              targetTeamSettings.backlogIteration.name +
              targetTeamSettings.defaultIteration.path
          };

          if (
            witType != undefined &&
            witType.fieldInstances.find(f => {
              return f.referenceName == "Custom.Application";
            }) != undefined
          ) {
            if (currentWorkItem["Custom.Application"] != undefined) {
              // ajout du code de code de system. si code systeme fournis sinon on pousse le nom du projet
              newWITParams["Custom.Application"] =
                currentWorkItem["Custom.Application"];
            } else {
              newWITParams["Custom.Application"] = ctx.project.name;
            }
          } else {
            newWITParams["System.Description"] = ctx.project.name;
          }

          workItemNavSvc
            .openNewWorkItem(witType.name, newWITParams)
            .then(function(newWIT: WorkItem) {
              if (newWIT != null) {
                AddRelationToCurrentWorkItem(newWIT, service, newWorkItemInfo, witClient, currentWorkItem);
              }
            });
        }
      );

      // witClient
      //   .createWorkItem(
      //     newWorkItem,
      //     targetTeam.project,
      //     witType.name
      //   )
      //   .then(function(response: WorkItem) {
      //     console.log("Response : ", response);

      //     //Add relation
      //     if (service != null) {
      //       service.addWorkItemRelations([
      //         {
      //           rel: newWorkItemInfo.linkType,
      //           url: response.url,
      //           attributes: {
      //             isLocked: false
      //           }
      //         }
      //       ]);
      //       service.setFieldValue("System.History", newWorkItemInfo['System.Comment']);

      //       // //Save
      //       // service.save().then(function(response) {
      //       //   WriteLog(" Saved");
      //       // },
      //       // function(error) {
      //       //   WriteLog(" Error saving: " + response);
      //       // });
      //     } else {
      //       //save using RestClient
      //       var workItemId = currentWorkItemFields["System.Id"];
      //       var document = [
      //         {
      //           op: "add",
      //           path: "/relations/-",
      //           value: {
      //             rel: newWorkItemInfo.linkType,
      //             url: response.url,
      //             attributes: {
      //               isLocked: false
      //             }
      //           }
      //         },
      //         { "op": "add", "path": "/fields/System.History", "value": newWorkItemInfo['System.Comment'] }
      //       ];

      //       witClient
      //         .updateWorkItem(document, workItemId)
      //         .then(function(response) {
      //           var a = response;
      //           VSS.getService(VSS.ServiceIds.Navigation).then(function(
      //             navigationService: IHostNavigationService
      //           ) {
      //             navigationService.reload();
      //           });
      //         });
      //     }
      //   }, function(reason) {
      //     OpenCreateWITDialog(witType, newWorkItemURI);
      //   });
    },
    function(reason) {
      ShowErrorMessage(
        "Une erreur est survenue pour charger le type dans le projet d'équipe."
      );
      console.log("Erreur de chargement de type : ", reason);
    }
  );
}

function AddRelationToCurrentWorkItem(newWIT: WorkItem, service: _WorkItemServices.IWorkItemFormService, newWorkItemInfo: any, witClient: _WorkItemRestClient.WorkItemTrackingHttpClient4_1, currentWorkItem: any) {
  console.log("created work item :", newWIT);
  //Add relation
  if (service != null) {
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
    //Save
    service.save().then(function (response) {
      WriteLog(" Saved");
    }, function (error) {
      WriteLog(" Error saving: " + newWIT);
    });
  }
  else {
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
      .then(function (response) {
        var a = response;
        VSS.getService(VSS.ServiceIds.Navigation).then(function (navigationService: IHostNavigationService) {
          navigationService.reload();
        });
      });
  }
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
    project: targetProjectName,
    projectId: "",
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
              witClient
                .getWorkItem(context.workItemId)
                .then(function(currentWorkItem) {
                  var currentWorkItemFields = currentWorkItem.fields;

                  currentWorkItemFields["System.Id"] = context.workItemId;

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
