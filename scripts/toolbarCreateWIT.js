define(["require", "exports", "TFS/WorkItemTracking/Services", "TFS/WorkItemTracking/RestClient", "TFS/Work/RestClient", "TFS/Core/RestClient"], function (require, exports, _WorkItemServices, _WorkItemRestClient, workRestClient, coreRestClient) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ctx = null;
    var targetProjectName = "DSD";
    function WriteLog(msg) {
        console.log('Create-Child-Links: ' + msg);
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
    function IsPropertyValid(taskTemplate, key) {
        if (taskTemplate.fields.hasOwnProperty(key) == false) {
            return false;
        }
        if (key.indexOf('System.Tags') >= 0) {
            return false;
        }
        return true;
    }
    function createWorkItemFromTemplate(currentWorkItem, taskTemplate, teamSettings, teamAreaPath, newWorkItemInfo) {
        var workItem = [];
        workItem.push({ "op": "add", "path": "/fields/System.Title", "value": newWorkItemInfo['System.Title'] });
        workItem.push({ "op": "add", "path": "/fields/System.History", "value": newWorkItemInfo['System.Comment'] });
        {
            workItem.push({ "op": "add", "path": "/fields/System.AreaPath", "value": teamAreaPath });
        }
        workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name + teamSettings.defaultIteration.path });
        if (taskTemplate != undefined && taskTemplate.fieldInstances.find(function (f) { return f.referenceName == "Custom.Application"; }) != undefined) {
            if (currentWorkItem["Custom.Application"] != undefined) {
                workItem.push({ "op": "add", "path": "/fields/Custom.Application", "value": currentWorkItem["Custom.Application"] });
            }
            else {
                workItem.push({ "op": "add", "path": "/fields/Custom.Application", "value": ctx.project.name });
            }
        }
        else {
            workItem.push({ "op": "add", "path": "/fields/System.Description", "value": ctx.project.name });
        }
        return workItem;
    }
    function createWorkItem(service, currentWorkItem, teamSettings, targetTeam, targetTeamSettings, teamAreaPath, newWorkItemInfo) {
        var witClient = _WorkItemRestClient.getClient();
        witClient
            .getWorkItemType(targetTeam.project, newWorkItemInfo.witType)
            .then(function (witType) {
            var newWorkItem = createWorkItemFromTemplate(currentWorkItem, witType, targetTeamSettings, teamAreaPath, newWorkItemInfo);
            console.log("WIT to create :", newWorkItem, targetTeam, targetTeamSettings, newWorkItemInfo);
            witClient
                .createWorkItem(newWorkItem, targetTeam.project, witType.name)
                .then(function (response) {
                console.log("Response : ", response);
                if (service != null) {
                    service.addWorkItemRelations([
                        {
                            rel: newWorkItemInfo.linkType,
                            url: response.url
                        }
                    ]);
                    service.setFieldValue("System.History", newWorkItemInfo['System.Comment']);
                    service.beginSaveWorkItem(function (response) {
                        WriteLog(" Saved");
                    }, function (error) {
                        WriteLog(" Error saving: " + response);
                    });
                }
                else {
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
                        .then(function (response) {
                        var a = response;
                        VSS.getService(VSS.ServiceIds.Navigation).then(function (navigationService) {
                        });
                    });
                }
            }, function (reason) {
                ShowErrorMessage("La demande de soutien DSD n'a pas pu être créé.");
                console.log("Erreur de création de demande : ", reason);
            });
        }, function (reason) {
            ShowErrorMessage("Une erreur est survenue pour charger le type dans le projet d'équipe.");
            console.log("Erreur de chargement de type : ", reason);
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
            project: targetProjectName,
            projectId: "",
            team: newWorkItemInfo.Team,
            teamId: newWorkItemInfo.TeamId
        };
        var coreClient = coreRestClient.getClient();
        coreClient.getProject(targetTeam.project).then(function (project) {
            targetTeam.project = project.name;
            targetTeam.projectId = project.id;
            coreClient.getTeam(project.id, newWorkItemInfo.TeamId).then(function (team) {
                targetTeam.team = team.name;
                targetTeam.teamId = team.id;
            }, function (reason) {
                ShowErrorMessage("L'équipe de projet n'a pas été trouvé.");
                console.log("Erreur de chargement d'équipe : ", reason);
            });
        }, function (reason) {
            ShowErrorMessage("Le projet n'a pas été trouvé.");
            console.log("Erreur de chargement de projet : ", reason);
        });
        workClient.getTeamSettings(team)
            .then(function (teamSettings) {
            workClient.getTeamFieldValues(targetTeam).then(function (teamFields) {
                return teamFields.defaultValue;
            }).then(function (teamAreaPath) {
                workClient.getTeamSettings(targetTeam).then(function (targetTeamSettings) {
                    witClient.getWorkItem(context.workItemId)
                        .then(function (value) {
                        var currentWorkItem = value.fields;
                        currentWorkItem['System.Id'] = context.workItemId;
                        getWorkItemFormService().then(function (service) {
                            createWorkItem(service, currentWorkItem, teamSettings, targetTeam, targetTeamSettings, teamAreaPath, newWorkItemInfo);
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