VSS.require(["TFS/Dashboards/WidgetHelpers", "TFS/WorkItemTracking/Services"], function (_WidgetHelpers, _WorkItemServices) {
    _WidgetHelpers.IncludeWidgetStyles();
    _WidgetHelpers.IncludeWidgetConfigurationStyles();
    function getWorkItemFormService() {
        return _WorkItemServices.WorkItemFormService.getService();
    }
    VSS.register(VSS.getContribution().id, function () {
        return {
            onFieldChanged: function (args) {
                $(".events").append($("<div/>").text("onFieldChanged - " + JSON.stringify(args)));
            },
            onLoaded: function (args) {
                getWorkItemFormService().then(function (service) {
                    service.getFieldValues(["System.Id", "System.Title", "System.State", "System.CreatedDate"]).then(function (value) {
                        $(".events").append($("<div/>").text("onLoaded - " + JSON.stringify(value)));
                    });
                });
            },
            onUnloaded: function (args) {
                $(".events").empty();
                $(".events").append($("<div/>").text("onUnloaded - " + JSON.stringify(args)));
            },
            onSaved: function (args) {
                $(".events").append($("<div/>").text("onSaved - " + JSON.stringify(args)));
            },
            onReset: function (args) {
                $(".events").append($("<div/>").text("onReset - " + JSON.stringify(args)));
            },
            onRefreshed: function (args) {
                $(".events").append($("<div/>").text("onRefreshed - " + JSON.stringify(args)));
            }
        };
    });
    VSS.notifyLoadSucceeded();
    $("#clickme").click(function () {
        getWorkItemFormService().then(function (service) {
            service.setFieldValue("System.Title", "Title set from your group extension!");
            $('');
        });
    });
    $("#name").text(VSS.getWebContext().user.name + " require");
    $("div.title div.la-user-icon").text(VSS.getWebContext().user.name + " <" + VSS.getWebContext().user.uniqueName + ">");
    getWorkItemFormService().then(function (service) {
        service.getFieldValues(["System.Id", "System.Title", "System.ChangedDate", "System.State", "System.WorkItemType"]).then(function (myFields) {
            $("div.title div.la-primary-data-id").text(myFields["System.Id"]);
            $("div.title div.la-primary-data-title").text(myFields["System.Title"]);
            $("div.title span.la-primary-data-modified").text("Mise à jour de " + new Date(myFields["System.ChangedDate"]).toLocaleDateString());
            $("div.title span.la-primary-data-state").text(myFields["System.State"]);
            $("div.title div.la-primary-data-title").html(myFields["System.WorkItemType"]);
        });
    });
});
//# sourceMappingURL=app.js.map