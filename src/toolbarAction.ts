///<reference types="vss-web-extension-sdk" />

import * as _VSSServices from "VSS/Service";
import * as _WidgetHelpers from "TFS/Dashboards/WidgetHelpers";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as _workRestClient from "TFS/Work/RestClient";
import * as _coreRestClient from "TFS/Core/RestClient";
import * as _Controls from "VSS/Controls";
import * as _StatusIndicator from "VSS/Controls/StatusIndicator";
import * as _Dialogs from "VSS/Controls/Dialogs";

export function toolbarActionHandler(context) {
  "use strict";
  return {
    // This is a callback that gets invoked when a user clicks the newly contributed menu item
    // The actionContext parameter contains context data surrounding the circumstances of this
    // action getting invoked.
    execute: function(actionContext) {
      let dialogReturn;
      VSS.getService(VSS.ServiceIds.Dialog).then(function(
        dialogService: IHostDialogService
      ) {
        let extensionCtx = VSS.getExtensionContext();
        // Build absolute contribution ID for dialogContent
        let contributionId =
          extensionCtx.publisherId +
          "." +
          extensionCtx.extensionId +
          ".create-child-links-work-item-form-page";

        // Show dialog
        let dialogOptions = {
          title: "Créer une demande de soutien",
          width: 1000,
          height: 700,

          getDialogResult: function() {
            // Get the result from registrationForm object
            return dialogReturn ? dialogReturn.getFormData() : null;
          },

          okCallback: function(result) {
            // Log the result to the console
            VSS.require(
                [
                    "scripts/toolbarCreateWIT"
                ],
                function (toolbarCreateWIT) {
                    toolbarCreateWIT.create(actionContext, result);

                    VSS.notifyLoadSucceeded();
                });
          }
        };

        dialogService
          .openDialog(contributionId, dialogOptions)
          .then(function(dialog) {
            // Get registrationForm instance which is registered in registrationFormContent.html
            dialog
              .getContributionInstance("create-child-links-work-item-form-page")
              .then(function(registrationFormInstance) {
                // Keep a reference of registration form instance (to be used above in dialog options)
                dialogReturn = registrationFormInstance;

                dialogReturn.load();

                // Subscribe to form input changes and update the Ok enabled state
                dialogReturn.attachFormChanged(function(isValid) {
                  dialog.updateOkButton(isValid);
                });

                // Set the initial ok enabled state
                dialogReturn.isFormValid().then(function(isValid) {
                  dialog.updateOkButton(isValid);
                });
              });
          }, function(reason) {
            console.log("Failed to open create work item form", reason);
          });
      });
    }
  };
}
