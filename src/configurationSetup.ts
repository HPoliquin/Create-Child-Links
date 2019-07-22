///<reference types="vss-web-extension-sdk" />

import * as _VSSServices from "VSS/Service";
import * as _WidgetHelpers from "TFS/Dashboards/WidgetHelpers";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as _workRestClient from "TFS/Work/RestClient";
import * as _coreRestClient from "TFS/Core/RestClient";
import * as _Controls from "VSS/Controls";
import * as _StatusIndicator from "VSS/Controls/StatusIndicator";
import { ExtensionDataService } from "VSS/SDK/Services/ExtensionData";

export function create(context, newSetup) {
    VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService: IExtensionDataService) {
        // Set value in user scope
        dataService.setValue("projectIncluded", JSON.stringify(newSetup)).then(function(value) {
            console.log("projectIncluded saved to " + value);
        });
    });
}