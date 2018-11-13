///<reference types="vss-web-extension-sdk" />

VSS.require(["TFS/Dashboards/WidgetHelpers", "TFS/WorkItemTracking/Services"], function (_WidgetHelpers, _WorkItemServices) {
    // loading succeeded
    _WidgetHelpers.IncludeWidgetStyles();
    _WidgetHelpers.IncludeWidgetConfigurationStyles();


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

    VSS.notifyLoadSucceeded();
    // register a handler for the 'Click me!' button.        
    $("#clickme").click(function() {
            getWorkItemFormService().then(function(service) {
                service.setFieldValue("System.Title", "Title set from your group extension!");
                $('')
            });
        });

    $("#name").text(VSS.getWebContext().user.name + " require");
    $("div.title div.la-user-icon").text(VSS.getWebContext().user.name + " <" + VSS.getWebContext().user.uniqueName + ">");
    getWorkItemFormService().then(function(service) {
        service.getFieldValues(["System.Id", "System.Title", "System.ChangedDate", "System.State", "System.WorkItemType"]).then(function(myFields) { 
            $("div.title div.la-primary-data-id").text(myFields["System.Id"]);
            $("div.title div.la-primary-data-title").text(myFields["System.Title"]); 
            $("div.title span.la-primary-data-modified").text("Mise à jour de " + new Date(myFields["System.ChangedDate"]).toLocaleDateString()); 
            $("div.title span.la-primary-data-state").text(myFields["System.State"]); 

            //https://dev.azure.com/Cofomo-HPoliquin/_apis/wit/workitemicons/icon_test_case?color=660088&api-version=4.1-preview.1
        });
    });
    
});