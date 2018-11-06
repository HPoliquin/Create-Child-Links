import WitService = require("TFS/WorkItemTracking/Services");

var provider = () => {
    return {
        // Called when the menu item is clicked.
        execute: (args) => {
            var selectedProvider = parseProviderArgs(args);
            selectedProvider.execute();
        }
    }
};

var workItemFormProvider = function(workItemId: number) {
    return {
        execute : () => {

            VSS.getService(VSS.ServiceIds.Dialog).then(async (dialogService:IHostDialogService) => {

            });
        }
    };
};
var backlogProvider = function(workItemIds: Array<number>) {
    return {
        execute : () => {
            console.log("backlog provider executed");
            $.each(workItemIds, (index, workItemId) => {
                console.log("index: " + index, ", workItemId: " + workItemId);
            });

            


        }
    };
};
var notSupportedProvider = function() {
    return {
        execute : () => {
            console.log("Use of this context menu item is not supported in this context.");
            alert("You cannot perform this operation from here.");
            // TODO: disable the context menu item, raise alert message
        }
    };
};

function parseProviderArgs(args) {
    if (args.workItemId !== undefined) {
        return workItemFormProvider(args.workItemId);
    }
    else if (args.workItemIds !== undefined) {
        return backlogProvider(args.workItemIds);
    }
    else if (args.id !== undefined) {
        return notSupportedProvider();
    }
    return notSupportedProvider();
}

VSS.register(VSS.getContribution().id, provider);
