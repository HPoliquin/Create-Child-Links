///<reference types="vss-web-extension-sdk" />

VSS.require(["TFS/WorkItemTracking/Services"], function (_WorkItemServices) {
    // Get the WorkItemFormService.  This service allows you to get/set fields/links on the 'active' work item (the work item
    // that currently is displayed in the UI).
    function getWorkItemFormService()
    {
        return _WorkItemServices.WorkItemFormService.getService();
    }

    // Register a listener for the work item group contribution.
    VSS.register(VSS.getContribution().id, function () {
        return {
            // Called when the active work item is modified
            onFieldChanged: function(args) {
                $(".events").append($("<div/>").text("onFieldChanged - " + JSON.stringify(args)));
            },

            // Called when a new work item is being loaded in the UI
            onLoaded: function (args) {

                getWorkItemFormService().then(function(service) {            
                    // Get the current values for a few of the common fields
                    service.getFieldValues(["System.Id", "System.Title", "System.State", "System.CreatedDate"]).then(
                        function (value) {
                            $(".events").append($("<div/>").text("onLoaded - " + JSON.stringify(value)));
                        });
                });
            },

            // Called when the active work item is being unloaded in the UI
            onUnloaded: function (args) {
                $(".events").empty();
                $(".events").append($("<div/>").text("onUnloaded - " + JSON.stringify(args)));
            },

            // Called after the work item has been saved
            onSaved: function (args) {
                $(".events").append($("<div/>").text("onSaved - " + JSON.stringify(args)));
            },

            // Called when the work item is reset to its unmodified state (undo)
            onReset: function (args) {
                $(".events").append($("<div/>").text("onReset - " + JSON.stringify(args)));
            },

            // Called when the work item has been refreshed from the server
            onRefreshed: function (args) {
                $(".events").append($("<div/>").text("onRefreshed - " + JSON.stringify(args)));
            }
        }
    });            
});