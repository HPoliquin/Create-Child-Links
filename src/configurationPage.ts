///<reference types="vss-web-extension-sdk" />

import * as _VSSServices from "VSS/Service";
import * as _WidgetHelpers from "TFS/Dashboards/WidgetHelpers";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as _workRestClient from "TFS/Work/RestClient";
import * as _coreRestClient from "TFS/Core/RestClient";
import * as _Controls from "VSS/Controls";
import * as _StatusIndicator from "VSS/Controls/StatusIndicator";

var container = $(".widget-configuration");

var waitControlOptions = {
  target: $("#target"),
  cancellable: true,
  cancelTextFormat: "{0} to cancel",
  cancelCallback: function() {
    console.log("cancelled");
  }
};

var waitControl = _Controls.create(
  _StatusIndicator.WaitControl,
  container,
  waitControlOptions
);

var extensionCtx = VSS.getExtensionContext();
var webCtx = VSS.getWebContext();
var callbacks = [];

// Build absolute contribution ID for dialogContent
var contributionId =
  extensionCtx.publisherId +
  "." +
  extensionCtx.extensionId +
  ".configuration-form-page";

// Get the WorkItemFormService.  This service allows you to get/set fields/links on the 'active' work item (the work item
// that currently is displayed in the UI).
function getWorkItemFormService() {
  return _WorkItemServices.WorkItemFormService.getService();
}

function inputChanged() {
  // Execute registered callbacks
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i](isValid());
  }
}

function projectChanged() {
  let project = $("select.linkdialog-project-select").val();
  if (project !== undefined && project !== null && project.length > 0) {
    $("button.btn-add").prop("disabled", false);
  } else {
    $("button.btn-add").prop("disabled", true);
  }
  // Execute registered callbacks
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i](isValid());
  }
}

function projectIncludedChanged() {
  let project = $("select.linkdialog-project-included-select").val();
  if (project !== undefined && project !== null && project.length > 0) {
    $("button.btn-remove").prop("disabled", false);
  } else {
    $("button.btn-remove").prop("disabled", true);
  }
  // Execute registered callbacks
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i](isValid());
  }
}

function isValid() {
  return true;
}

function getFormData() {
  // Get form values
  return {
    ProjectIncluded: $("input.linkdialog-project-included-select").val()
  };
}

function isProjectIncluded(aProject) {
  var projectList = ["DSD"];
  return projectList.includes(aProject.name);
}

function onAddedClick() {
    $.each($("select.linkdialog-project-select option:selected"), function() {
        $("select.linkdialog-project-included-select").append($("<option>", {
            value: $(this).val(),
            text: $(this).text()
          }));          
    });

    $("select.linkdialog-project-select").find("option:selected").remove()
    .end()
    .val("");
    projectChanged();
    projectIncludedChanged();
    console.log("on added Clicked");
}

function onRemovedClick() {
    $.each($("select.linkdialog-project-included-select option:selected"), function() {
        $("select.linkdialog-project-select").append($("<option>", {
            value: $(this).val(),
            text: $(this).text()
          }));          
    });
    $("select.linkdialog-project-included-select").find("option:selected").remove()
    .end()
    .val("");
    projectChanged();
    projectIncludedChanged();
    console.log("on Removed Clicked");
}


function getProjects() {
  waitControl.startWait();
  var client = _WorkItemRestClient.getClient();

  var coreClient = _coreRestClient.getClient();
  coreClient.getProjects().then(
    function(projects) {
      if (projects !== undefined && projects.length > 0) {
        $("select.linkdialog-project-select")
          .find("option")
          .remove()
          .end()
          .val("");

        $("select.linkdialog-project-included-select")
          .find("option")
          .remove()
          .end()
          .val("");

        projects.forEach(function(project) {
          if (isProjectIncluded(project)) {
            $("select.linkdialog-project-included-select").append(
              $("<option>", {
                value: project.id,
                text: project.name
              })
            );
          } else {
            $("select.linkdialog-project-select").append(
              $("<option>", {
                value: project.id,
                text: project.name
              })
            );
          }
        });
      }
      waitControl.endWait();
    },
    function(reason) {
      waitControl.endWait();
    }
  );
}

// Register a listener for the work item group contribution.
export function ConfigurationPageHandler(context) {
  "use strict";
  return {
    load: function(widgetSettings) {
      getProjects();

      $("select.linkdialog-project-select").on("change", projectChanged);

      $("select.linkdialog-project-included-select").on(
        "change",
        projectIncludedChanged
      );

      $("button.btn-add").on("click", onAddedClick);
      $("button.btn-remove").on("click", onRemovedClick);

      return _WidgetHelpers.WidgetStatusHelper.Success();
    },

    isFormValid: function() {
      return isValid();
    },

    getFormData: function() {
      return getFormData();
    },

    attachFormChanged: function(cb) {
      callbacks.push(cb);
    }
  };
}
