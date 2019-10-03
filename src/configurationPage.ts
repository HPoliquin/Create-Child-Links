///<reference types="vss-web-extension-sdk" />

import * as _VSSServices from "VSS/Service";
import * as _WidgetHelpers from "TFS/Dashboards/WidgetHelpers";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as _workRestClient from "TFS/Work/RestClient";
import * as _coreRestClient from "TFS/Core/RestClient";
import * as _Controls from "VSS/Controls";
import * as _StatusIndicator from "VSS/Controls/StatusIndicator";

interface IProjectInfo {
  project: string;
  projectId: string;
}

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
var projectList = [];

// // Build absolute contribution ID for dialogContent

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

// function inputChanged() {
//   // Execute registered callbacks
//   for (var i = 0; i < callbacks.length; i++) {
//     callbacks[i](isValid());
//   }
// }

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
  return $("select.linkdialog-project-included-select option").length > 0;
}

function getFormData() {
  // Get form values
  let ProjectSelected = [];
  $.each($("select.linkdialog-project-included-select option"), function() {
    let option : IProjectInfo = {
      project : $(this).text(),
      projectId : $(this).val()

    }
    ProjectSelected.push(option);
  });

  return {
    ProjectIncluded: ProjectSelected
  };
}

function isProjectIncluded(aProject) {
  return projectList.indexOf(aProject.id) > -1;
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
}


function getProjects() {
  waitControl.startWait();
  // var client = _WorkItemRestClient.getClient();

  var coreClient = _coreRestClient.getClient();
  coreClient.getProjects("wellFormed", 1500).then(
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

        projects.sort(function(project1, project2) {
          return project2.name.toUpperCase() < project1.name.toUpperCase() ? 1 : -1;
        })

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
      // Get data service
      VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService: IExtensionDataService) {
        // Get value in user scope
        dataService.getValue("projectIncluded").then(function(value: string) {
          if(value !== undefined) {
            let myProjectList = JSON.parse(value);
            $.each(myProjectList, function(key:string, value: [IProjectInfo]) {
              $.each(value, function(index, elementValue) {
                projectList.push(elementValue.projectId)
              });
            });
            getProjects();
          } else {
            getProjects();
          }
        }, function(reason) {
          console.log("Failed to load the projectIncluded Setting", reason);
          getProjects();
        });
      }, function(reason) {
        console.log("Failed to load the IExtensionDataService", reason);
        getProjects();
      });

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
