///<reference types="vss-web-extension-sdk" />

import { Control } from "VSS/Controls";
import * as ExtensionContracts from "TFS/WorkItemTracking/ExtensionContracts";

var control;

var provider = () => {
  return {
    onLoaded: (workItemLoadedArgs: ExtensionContracts.IWorkItemLoadedArgs) => {
      // create the control
      var teamName = VSS.getConfiguration().witInputs[
        "create-child-links-work-item-form-control-teamname"
      ];
      control = new Control(teamName);
    },
    onFieldChanged: (
      fieldChangedArgs: ExtensionContracts.IWorkItemFieldChangedArgs
    ) => {
      var changedValue = fieldChangedArgs.changedFields[control.getFieldName()];
      if (changedValue !== undefined) {
        control.updateExternal(changedValue);
      }
    }
  };
};

VSS.register(VSS.getContribution().id, provider);
