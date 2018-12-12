///<reference types="vss-web-extension-sdk" />

VSS.require(["TFS/Dashboards/WidgetHelpers", "TFS/WorkItemTracking/Services", "TFS/WorkItemTracking/RestClient"], 
        function (_WidgetHelpers, _WorkItemServices, _WorkRestClient) {
    // loading succeeded
    _WidgetHelpers.IncludeWidgetStyles();
    _WidgetHelpers.IncludeWidgetConfigurationStyles();


    // that currently is displayed in the UI).
    function getWorkItemFormService()
    {
        return _WorkItemServices.WorkItemFormService.getService();
    }            

    VSS.notifyLoadSucceeded();

    $("#name").text(VSS.getWebContext().user.name);
    $("div.title div.la-user-icon").text(VSS.getWebContext().user.name + " <" + VSS.getWebContext().user.uniqueName + ">");

    getWorkItemFormService().then(function(service) {
        service.getFieldValues(["System.Id", "System.Title", "System.ChangedDate", "System.State", "System.WorkItemType"]).then(function(myFields) { 
            $("div.title div.la-primary-data-id").text(myFields["System.Id"]);
            $("div.title div.la-primary-data-title").text(myFields["System.Title"]); 
            $("div.title span.la-primary-data-modified").text("Mise à jour de " + new Date(myFields["System.ChangedDate"]).toLocaleDateString()); 
            $("div.title span.la-primary-data-state").text(myFields["System.State"]); 
            $("div.title div.la-primary-data-title").html(myFields["System.WorkItemType"]); 
        });
    });
    
});