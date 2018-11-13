define(["require", "exports", "VSS/Controls"], function (require, exports, Controls_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var control;
    var provider = function () {
        return {
            onLoaded: function (workItemLoadedArgs) {
                var teamName = VSS.getConfiguration().witInputs["create-child-links-work-item-form-control-teamname"];
                control = new Controls_1.Control(teamName);
            },
            onFieldChanged: function (fieldChangedArgs) {
                var changedValue = fieldChangedArgs.changedFields[control.getFieldName()];
                if (changedValue !== undefined) {
                    control.updateExternal(changedValue);
                }
            }
        };
    };
    VSS.register(VSS.getContribution().id, provider);
});
//# sourceMappingURL=teamname.js.map