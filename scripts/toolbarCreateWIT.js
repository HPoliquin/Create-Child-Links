define(["require", "exports", "TFS/WorkItemTracking/Services", "TFS/WorkItemTracking/RestClient", "TFS/Work/RestClient"], function (require, exports, _WorkItemServices, _WorkItemRestClient, workRestClient) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ctx = null;
    function ShowDialog(message) {
        var dialogOptions = {
            title: "Create-Child-Links",
            width: 300,
            height: 200,
            resizable: false,
        };
        VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogSvc) {
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
        workItem.push({ "op": "add", "path": "/fields/System.Title", "value": newWorkItemInfo['System.Title'] });
        workItem.push({ "op": "add", "path": "/fields/System.AreaPath", "value": currentWorkItem['System.AreaPath'] });
        workItem.push({ "op": "add", "path": "/fields/System.IterationPath", "value": teamSettings.backlogIteration.name + teamSettings.defaultIteration.path });
        workItem.push({ "op": "add", "path": "/fields/System.AssignedTo", "value": ctx.user.uniqueName });
        return workItem;
    }
    function createWorkItem(service, currentWorkItem, teamSettings, newWorkItemInfo) {
        var witClient = _WorkItemRestClient.getClient();
        var newWorkItem = createWorkItemFromTemplate(currentWorkItem, teamSettings, newWorkItemInfo);
        witClient
            .createWorkItem(newWorkItem, VSS.getWebContext().project.name, newWorkItemInfo.witType)
            .then(function (response) {
            if (service != null) {
                service.addWorkItemRelations([
                    {
                        rel: newWorkItemInfo.linkType,
                        url: response.url
                    }
                ]);
                service.beginSaveWorkItem(function (response) {
                }, function (error) {
                    ShowDialog(" Error saving: " + response);
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
                    }
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
        console.log("init toolbar code", context, newWorkItemInfo);
        var witClient = _WorkItemRestClient.getClient();
        var workClient = workRestClient.getClient();
        ctx = VSS.getWebContext();
        var team = {
            project: ctx.project.name,
            projectId: ctx.project.id,
            teamId: ctx.team.id,
            team: ctx.team.name
        };
        workClient.getTeamSettings(team)
            .then(function (teamSettings) {
            witClient.getWorkItem(context.workItemId)
                .then(function (value) {
                var currentWorkItem = value.fields;
                currentWorkItem['System.Id'] = context.workItemId;
                var workItemType = currentWorkItem["System.WorkItemType"];
                console.log("currentWorkItem", currentWorkItem);
                getWorkItemFormService().then(function (service) {
                    createWorkItem(service, currentWorkItem, teamSettings, newWorkItemInfo);
                });
            });
        });
    }
    exports.create = create;
});
//# sourceMappingURL=toolbarCreateWIT.js.map