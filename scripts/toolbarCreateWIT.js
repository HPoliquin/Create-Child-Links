define(["require", "exports", "TFS/WorkItemTracking/Services", "TFS/WorkItemTracking/RestClient", "TFS/Work/RestClient", "TFS/Core/RestClient"], function (require, exports, _WorkItemServices, _WorkItemRestClient, workRestClient, coreRestClient) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        workItem.push({ "op": "add", "path": "/fields/System.Title", "value": newWorkItemInfo['System.Title'] });
        workItem.push({ "op": "add", "path": "/fields/System.History", "value": newWorkItemInfo['System.Comment'] });
        workItem.push({ "op": "add", "path": "/fields/System.AreaPath", "value": teamSettings.backlogIteration.name + "\\" + newWorkItemInfo.Team });
        workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name + teamSettings.defaultIteration.path });
        return workItem;
    }
    function createWorkItem(service, currentWorkItem, teamSettings, targetTeam, targetTeamSettings, newWorkItemInfo) {
        var witClient = _WorkItemRestClient.getClient();
        var newWorkItem = createWorkItemFromTemplate(currentWorkItem, targetTeamSettings, newWorkItemInfo);
        console.log("WIT to create :", newWorkItem, targetTeam, targetTeamSettings, newWorkItemInfo);
        witClient
            .createWorkItem(newWorkItem, targetTeam.project, newWorkItemInfo.witType)
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
            });
        });
        workClient.getTeamSettings(team)
            .then(function (teamSettings) {
            workClient.getTeamSettings(targetTeam).then(function (targetTeamSettings) {
                witClient.getWorkItem(context.workItemId)
                    .then(function (value) {
                    var currentWorkItem = value.fields;
                    currentWorkItem['System.Id'] = context.workItemId;
                    getWorkItemFormService().then(function (service) {
                        createWorkItem(service, currentWorkItem, teamSettings, targetTeam, targetTeamSettings, newWorkItemInfo);
                    });
                });
            });
        });
    }
    exports.create = create;
});
//# sourceMappingURL=toolbarCreateWIT.js.map