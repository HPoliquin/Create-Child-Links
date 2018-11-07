VSS.require(["TFS/WorkItemTracking/Services"], function (_WorkItemServices) {
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
});
//# sourceMappingURL=app.js.map