define(["require", "exports", "TFS/WorkItemTracking/Services", "TFS/WorkItemTracking/RestClient", "TFS/Work/RestClient", "TFS/Core/RestClient"], function (require, exports, _WorkItemServices, _WorkItemRestClient, workRestClient, coreRestClient) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ctx = null;
    var targetProjectName = "DSD";
    function WriteLog(msg) {
        console.log("Create-Child-Links: " + msg);
    }
    function ShowErrorMessage(message, title) {
        if (title === void 0) { title = "Une erreur est survenue"; }
        VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService) {
            var dialogOptions = {
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
    function createWorkItem(service, currentWorkItem, currentWorkItemFields, teamSettings, targetTeam, targetTeamSettings, teamAreaPath, newWorkItemInfo) {
        var witClient = _WorkItemRestClient.getClient();
        witClient.getWorkItemType(targetTeam.project, newWorkItemInfo.witType).then(function (witType) {
            console.log("WIT to create :", witType, targetTeam, targetTeamSettings, newWorkItemInfo);
            var newCTX = VSS.getWebContext();
            newCTX.project.id = "";
            newCTX.project.name = targetTeam.project;
            newCTX.team.id = "";
            newCTX.team.name = targetTeam.team;
            _WorkItemServices.WorkItemFormNavigationService.getService(newCTX).then(function (workItemNavSvc) {
                var newWITParams = createNewWITParam(witType);
                workItemNavSvc
                    .openNewWorkItem(witType.name, newWITParams)
                    .then(function (newWIT) {
                    if (newWIT != null) {
                        AddRelationToCurrentWorkItem(newWIT, service, newWorkItemInfo, witClient, currentWorkItem);
                    }
                });
            });
        }, function (reason) {
            ShowErrorMessage("Une erreur est survenue pour charger le type dans le projet d'équipe.");
            console.log("Erreur de chargement de type : ", reason);
        });
        function createNewWITParam(witType) {
            console.log("Creating new WIT Params of type", witType);
            var newWITParams = {
                "System.Title": newWorkItemInfo["System.Title"],
                "System.AreaPath": teamAreaPath,
                "System.History": newWorkItemInfo["System.Comment"],
                "System.IterationPath": targetTeamSettings.backlogIteration.name +
                    targetTeamSettings.defaultIteration.path
            };
            if (witType != undefined &&
                witType.fieldInstances.find(function (f) {
                    return f.referenceName == "Custom.Application";
                }) != undefined) {
                if (currentWorkItem["Custom.Application"] != undefined) {
                    newWITParams["Custom.Application"] =
                        currentWorkItem["Custom.Application"];
                }
                else {
                    newWITParams["Custom.Application"] = ctx.project.name;
                }
            }
            else {
                newWITParams["System.Description"] = ctx.project.name;
            }
            console.log("New WIT Params", newWITParams);
            return newWITParams;
        }
    }
    function AddRelationToCurrentWorkItem(newWIT, service, newWorkItemInfo, witClient, currentWorkItem) {
        console.log("Created work item, adding relation to :", newWIT);
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
                VSS.getService(VSS.ServiceIds.Navigation).then(function (navigationService) {
                    navigationService.reload();
                });
            });
        }
    }
    function create(context, newWorkItemInfo) {
        var witClient = _WorkItemRestClient.getClient();
        var workClient = workRestClient.getClient();
        ctx = VSS.getWebContext();
        var team = {
            project: ctx.project.name,
            projectId: ctx.project.id,
            teamId: ctx.team.id,
            team: ctx.team.name
        };
        var targetTeam = {
            project: targetProjectName,
            projectId: "",
            team: newWorkItemInfo.Team,
            teamId: newWorkItemInfo.TeamId
        };
        var coreClient = coreRestClient.getClient();
        coreClient.getProject(targetTeam.project).then(function (project) {
            targetTeam.project = project.name;
            targetTeam.projectId = project.id;
            coreClient.getTeam(project.id, newWorkItemInfo.TeamId).then(function (myTeam) {
                targetTeam.team = myTeam.name;
                targetTeam.teamId = myTeam.id;
            }, function (reason) {
                ShowErrorMessage("L'équipe de projet n'a pas été trouvé.");
                console.log("Erreur de chargement d'équipe : ", reason);
            });
        }, function (reason) {
            ShowErrorMessage("Le projet n'a pas été trouvé.");
            console.log("Erreur de chargement de projet : ", reason);
        });
        workClient.getTeamSettings(team).then(function (teamSettings) {
            workClient
                .getTeamFieldValues(targetTeam)
                .then(function (teamFields) {
                return teamFields.defaultValue;
            })
                .then(function (teamAreaPath) {
                workClient.getTeamSettings(targetTeam).then(function (targetTeamSettings) {
                    witClient
                        .getWorkItem(context.workItemId)
                        .then(function (currentWorkItem) {
                        var currentWorkItemFields = currentWorkItem.fields;
                        currentWorkItemFields["System.Id"] = context.workItemId;
                        getWorkItemFormService().then(function (service) {
                            createWorkItem(service, currentWorkItem, currentWorkItemFields, teamSettings, targetTeam, targetTeamSettings, teamAreaPath, newWorkItemInfo);
                        });
                    });
                }, function (reason) {
                    ShowErrorMessage("Les configuration de l'équipe n'as pas été chargé.");
                    console.log("Erreur de chargement de configuration d'équipe : ", reason);
                });
            });
        }, function (reason) {
            ShowErrorMessage("Les configuration de l'équipe n'as pas été chargé.");
            console.log("Erreur de chargement de configuration d'équipe : ", reason);
        });
    }
    exports.create = create;
});
//# sourceMappingURL=toolbarCreateWIT.js.map