define(["require", "exports", "TFS/WorkItemTracking/Services", "TFS/WorkItemTracking/RestClient", "TFS/Work/RestClient", "TFS/Core/RestClient"], function (require, exports, _WorkItemServices, _WorkItemRestClient, workRestClient, coreRestClient) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ctx = null;
    function WriteLog(msg) {
        var optionalparams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalparams[_i - 1] = arguments[_i];
        }
        console.log("Create-Child-Links: ", msg, optionalparams);
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
            var newCTX = VSS.getWebContext();
            newCTX.project.id = targetTeam.projectId;
            newCTX.project.name = targetTeam.project;
            newCTX.team.id = targetTeam.teamId;
            newCTX.team.name = targetTeam.team;
            VSS.getService(_WorkItemServices.WorkItemFormNavigationService.contributionId, newCTX).then(function (workItemNavSvc) {
                var newWITParams = createNewWITParam(witType);
                workItemNavSvc.openNewWorkItem(witType.name, newWITParams).then(function (newWIT) {
                    if (newWIT != null) {
                        AddRelationToCurrentWorkItem(newWIT, service, newWorkItemInfo, witClient, currentWorkItem);
                    }
                }, function (reason) {
                    console.log("Une erreur de création de la fenêtre de WIT", reason);
                    var newWorkItem = createWorkItemFromTemplate(currentWorkItem, currentWorkItemFields, witType, targetTeamSettings, teamAreaPath, newWorkItemInfo);
                    witdCreateWorkItem(service, newWorkItem, witType);
                });
            });
        }, function (reason) {
            ShowErrorMessage("Une erreur est survenue pour charger le type dans le projet d'équipe.");
            console.log("Erreur de chargement de type : ", reason);
        });
        function createWorkItemFromTemplate(currentWorkItem, currentWorkItemFields, taskTemplate, teamSettings, teamAreaPath, newWorkItemInfo) {
            var workItem = [];
            workItem.push({
                op: "add",
                path: "/fields/System.Title",
                value: newWorkItemInfo["System.Title"]
            });
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
            {
                workItem.push({
                    op: "add",
                    path: "/fields/System.AreaPath",
                    value: teamAreaPath
                });
            }
            workItem.push({
                op: "add",
                path: "/fields/System.IterationPath",
                value: teamSettings.backlogIteration.name + teamSettings.defaultIteration.path
            });
            var myCustomApplicationField = undefined;
            for (var i = 0; i < taskTemplate.fieldInstances.length; i++) {
                if (taskTemplate.fieldInstances[i].referenceName == "Custom.Application") {
                    myCustomApplicationField = taskTemplate.fieldInstances[i];
                    break;
                }
            }
            if (taskTemplate != undefined && myCustomApplicationField != undefined) {
                if (currentWorkItem["Custom.Application"] != undefined) {
                    workItem.push({
                        op: "add",
                        path: "/fields/Custom.Application",
                        value: currentWorkItem["Custom.Application"]
                    });
                }
                else {
                    workItem.push({
                        op: "add",
                        path: "/fields/Custom.Application",
                        value: ctx.project.name
                    });
                }
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
            return workItem;
        }
        function witdCreateWorkItem(service, newWorkItem, witType) {
            var myWIT;
            witClient
                .createWorkItem(newWorkItem, targetTeam.project, witType.name)
                .then(function (response) {
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
                    service.setFieldValue("System.History", newWorkItemInfo["System.Comment"]);
                }
                else {
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
                        .then(function (response) {
                        var a = response;
                        VSS.getService(VSS.ServiceIds.Navigation).then(function (navigationService) {
                            navigationService.reload();
                        });
                    });
                    myWIT = response;
                }
            }, function (reason) {
                console.log("Impossible de créer la demande de soutien :", reason);
            })
                .then(function (response) {
                _WorkItemServices.WorkItemFormNavigationService.getService().then(function (workItemNavSvc) {
                    workItemNavSvc.openWorkItem(myWIT.id, true);
                });
            });
            return myWIT;
        }
        function createNewWITParam(witType) {
            var newWITParams = {
                "System.Title": newWorkItemInfo["System.Title"],
                "System.AreaPath": teamAreaPath,
                "System.History": newWorkItemInfo["System.Comment"],
                "System.Description": newWorkItemInfo["System.Description"],
                "System.IterationPath": targetTeamSettings.backlogIteration.name,
                "System.TeamProject": targetTeam.project
            };
            if (targetTeamSettings.defaultIteration != undefined && targetTeamSettings.defaultIteration.path != undefined) {
                newWITParams["System.IterationPath"] = targetTeamSettings.backlogIteration.name +
                    targetTeamSettings.defaultIteration.path;
            }
            var myCustomApplicationField = undefined;
            for (var i = 0; i < witType.fieldInstances.length; i++) {
                if (witType.fieldInstances[i].referenceName == "Custom.Application") {
                    myCustomApplicationField = witType.fieldInstances[i];
                    break;
                }
            }
            if (witType != undefined && myCustomApplicationField != undefined) {
                if (currentWorkItem["Custom.Application"] != undefined) {
                    newWITParams["Custom.Application"] =
                        currentWorkItem["Custom.Application"];
                }
                else {
                    newWITParams["Custom.Application"] = ctx.project.name;
                }
            }
            return newWITParams;
        }
    }
    function AddRelationToCurrentWorkItem(newWIT, service, newWorkItemInfo, witClient, currentWorkItem) {
        if (service != null) {
            service.hasActiveWorkItem().then(function (hasActiveWorkItem) {
                if (hasActiveWorkItem) {
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
                        WriteLog(" Sauvegarde à partir du service: ", response);
                    }, function (error) {
                        WriteLog(" Erreur de sauvegarde: ", newWIT);
                    });
                }
                else {
                    AddRelationToCurrentWorkItemJSon(newWIT, service, newWorkItemInfo, witClient, currentWorkItem);
                }
            }, function (reason) {
                WriteLog("Failed to get the current work item service:", reason);
                AddRelationToCurrentWorkItemJSon(newWIT, service, newWorkItemInfo, witClient, currentWorkItem);
            });
        }
    }
    function AddRelationToCurrentWorkItemJSon(newWIT, service, newWorkItemInfo, witClient, currentWorkItem) {
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
            WriteLog("Work item updated via JSON", response);
        }, function (reason) {
            WriteLog("Failed to save work item via json", reason);
        });
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
            project: newWorkItemInfo.Project,
            projectId: newWorkItemInfo.ProjectId,
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
                    var currentContextWorkItemId = context.workItemId !== undefined ? context.workItemId :
                        context.id !== undefined ? context.id : context.workItemIds[0];
                    witClient
                        .getWorkItem(currentContextWorkItemId)
                        .then(function (currentWorkItem) {
                        var currentWorkItemFields = currentWorkItem.fields;
                        currentWorkItemFields["System.Id"] = currentContextWorkItemId;
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