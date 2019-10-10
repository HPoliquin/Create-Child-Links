///<reference types="vss-web-extension-sdk" />
///<reference types="materialize-css"/>

import * as _VSSServices from "VSS/Service";
import * as _WidgetHelpers from "TFS/Dashboards/WidgetHelpers";
import * as _WorkItemServices from "TFS/WorkItemTracking/Services";
import * as _WorkItemRestClient from "TFS/WorkItemTracking/RestClient";
import * as _workRestClient from "TFS/Work/RestClient";
import * as _coreRestClient from "TFS/Core/RestClient";
import * as _Controls from "VSS/Controls";
import * as _StatusIndicator from "VSS/Controls/StatusIndicator";

interface IConfigurationInfo {
  projects: IProjectInfo[],
  teams: string[]
}

interface IProjectInfo {
  project: string;
  projectId: string;
}

interface ITeamInfo {
  team: string;
  teamId: string;
}

var container = $(".widget-configuration");

var waitControlOptions = {
  target: $("#target"),
  cancellable: true,
  cancelTextFormat: "{0} pour annuler",
  cancelCallback: function() {
    console.log("cancelled operation.");
  }
};

var waitControl = _Controls.create(
  _StatusIndicator.WaitControl,
  container,
  waitControlOptions
);

var extensionCtx = VSS.getExtensionContext();
var webCtx = VSS.getWebContext();
// Build absolute contribution ID for dialogContent
var contributionId =
  extensionCtx.publisherId +
  "." +
  extensionCtx.extensionId +
  ".create-child-links-work-item-form-page";

// Get the WorkItemFormService.  This service allows you to get/set fields/links on the 'active' work item (the work item
// that currently is displayed in the UI).
function getWorkItemFormService() {
  return _WorkItemServices.WorkItemFormService.getService();
}

var callbacks = [];

var projectList:IProjectInfo[] = [];
var teamList = [];

function inputChanged() {
  // Execute registered callbacks
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i](isValid());
  }
}

function projectChanged() {
  let teamSelect = document.querySelector("select.linkdialog-project-select");
  let selectTeamInstance = M.FormSelect.init(teamSelect);
  teamList = selectTeamInstance.getSelectedValues();

  if(teamList.length >0 && teamList[0] !== "Choisir une équipe")
  {
    let teamID = teamList[0];
    let projectID = $("select.linkdialog-project-select option[value='" + teamID + "']").parent().attr("value");

    getWITType(projectID, teamID);
  } 
  else 
  {
    $("select.linkdialog-wittype-select")
            .find("option")
            .remove()
            .end()
            .val("");
    refreshWITTypesSelect();
  }
  

  // Execute registered callbacks
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i](isValid());
  }
}

function isValid() {
  // Check whether form is valid or not
  let projectIndex = $("select.linkdialog-project-select").prop(
    "selectedIndex"
  );

  let linkTypeIndex = $("select.linkdialog-linktype-select").prop(
    "selectedIndex"
  );
  let wittTpeIndex = $("select.linkdialog-wittype-select").prop(
    "selectedIndex"
  );
  let titreLength = $("input#dialog-label").val().length;

  return (
    projectIndex > 0 &&
    linkTypeIndex >= 0 &&
    wittTpeIndex >= 0 &&
    titreLength > 0
  );
}

function refreshTeamsSelect() 
{
  var elems = document.querySelector('select.linkdialog-project-select');
  let selectTeamInstance = M.FormSelect.init(elems);
}

function refreshWITTypesSelect()
{
  var elems = document.querySelector('select.linkdialog-wittype-select');
  let selectWITInstance = M.FormSelect.init(elems);
}

function refreshWITCategory()
{
  var elems = document.querySelector('select.linkdialog-linktype-select');
  let selectWITCategoryInstance = M.FormSelect.init(elems);
}

function getFormData() {
  // Get form values
  return {
    linkType: $("select.linkdialog-linktype-select").val(),
    witType: $("select.linkdialog-wittype-select option:selected").html(),
    "System.Title": $("input#dialog-label").val(),
    "System.Comment": $("textarea#comment").val(),
    "System.Description": $("textarea#description").val(),
    Project: $("select.linkdialog-project-select option:selected").parent("optgroup").attr("label"),
    ProjectId: $("select.linkdialog-project-select option:selected").parent("optgroup").attr("value"),
    Team: $("select.linkdialog-project-select option:selected").text(),
    TeamId: $("select.linkdialog-project-select option:selected").val()
  };

}

function teamAllowed(aTeam: string) {
  let teamFound = false;

  for( var i = 0; i < teamList.length; i++){
    if ( teamList[i] === aTeam) {
      teamFound = true;
      break;
    }
  }

  return teamFound;  
}


function isProjectIncluded(aProject: string) {
  let projectFound = false;
  for( var i = 0; i < projectList.length; i++){ 
    if ( projectList[i].projectId === aProject) {
      projectFound = true;
      break;
    }
  }

  return projectFound;  
}

function getProjects() {
  waitControl.startWait();
  var client = _WorkItemRestClient.getClient();

  var coreClient = _coreRestClient.getClient();
  coreClient.getProjects(-1, 1500).then(
    function(projects) {
      if (projects !== undefined && projects.length > 0) {
        $("select.linkdialog-project-select")
          .find("optgroup")
          .remove()
          .end()
          .append('<option value="Choisir une équipe" selected>Choisir une équipe</option>')
          .val("");

        projects.sort(function(project1, project2) {
          return project2.name.toUpperCase() < project1.name.toUpperCase() ? 1 : -1;
        })

        projects.forEach(function(project) {
          if (isProjectIncluded(project.id)) {
            $("select.linkdialog-project-select").append($("<optgroup>", {
              disabled: "disabled",
              value: project.id,
              label: project.name
            }));
            let _projectInfo: IProjectInfo = {project: project.name, projectId: project.id};
            getTeams(_projectInfo);
          }
        });
      }
      waitControl.endWait();
    },
    function(reason) {
      console.log(reason);
      waitControl.endWait();
    }
  );
}

function getWITType(projectID: string, teamID: string)
{
  if(teamID !== undefined && teamID.length >0)
  {
    waitControl.startWait();

    $("select.linkdialog-wittype-select")
            .find("option")
            .remove()
            .end()
            .val("");

    let client = _WorkItemRestClient.getClient();
    let coreClient = _coreRestClient.getClient();
    coreClient.getTeam(projectID, teamID).then(function(team) {

    });


    client.getWorkItemTypeCategories(projectID).then(
      function(witCategories) {
        var category = undefined;
        for (let i = 0; i < witCategories.length; i++) {
          if (
            witCategories[i].referenceName ==
            "Microsoft.RequirementCategory"
          ) {
            category = witCategories[i];
            break;
          }
        }

        let witTypeAdded = 0;
        if (category != undefined || category.workItemTypes.length == 0) {
          

          category.workItemTypes.forEach(function(wit) {
            witTypeAdded++;
            $("select.linkdialog-wittype-select").append(
              $("<option>", {
                value: wit.name,
                text: wit.name
              })
            );
          });
        }
        if (witTypeAdded == 0) {
          client.getWorkItemTypes(projectID).then(function(witTypes) {
            witTypes.forEach(function(element) {
              if (element.isDisabled === false) {
                $("select.linkdialog-wittype-select").append(
                  $("<option>", {
                    value: element.name,
                    text: element.name
                  })
                );
              }
            });
          });
        }
        refreshWITTypesSelect();
        waitControl.endWait();
      },
      function(reason) {
        refreshWITTypesSelect();
        waitControl.endWait();
      }
    );
  }
}

function getTeams(targetProject: IProjectInfo) {
  if (
    targetProject !== undefined
  ) {
    waitControl.startWait();
    let client = _WorkItemRestClient.getClient();
    let coreClient = _coreRestClient.getClient();
    coreClient.getProject(targetProject.projectId).then(
      function(project) {
        coreClient.getTeams(project.id).then(
          function(teams) {
            $("select.linkdialog-project-select")
              .find("optgroup[label='" + project.name + "'] option")
              .remove()
              .end();

            teams.forEach(function(team) {
              if(teamAllowed(team.id))
              {
                $("select.linkdialog-project-select").find("optgroup[label='" + project.name + "']").append(
                  $("<option>", {
                    value: team.id,
                    text: team.name
                  })
                );
              }
            });
            refreshTeamsSelect();
            waitControl.endWait();
          },
          function(reason) {
            $("select.linkdialog-project-select")
              .find("optgroup[label='" + project.name + "'] option")
              .remove()
              .end()
              .val("");
            refreshTeamsSelect();
            waitControl.endWait();
          }
        );
      },
      function(reason) {
        console.log("project cannot be found", reason);
      }
    );
  }
}

// Register a listener for the work item group contribution.
export function workItemFormPageHandler(context) {
  "use strict";
  return {
    load: function(widgetSettings) {
      // Get data service
      VSS.getService(VSS.ServiceIds.ExtensionData).then(function(dataService: IExtensionDataService) {
        // Get value in user scope
        dataService.getValue("projectIncluded").then(function(value: string) {
          if(value !== undefined) {
            let myProjectList = JSON.parse(value);
            $.each(myProjectList, function(key:string, value: IConfigurationInfo) {
              // $.each(value, function(index, elementValue) {
                projectList = value.projects===undefined? [] : value.projects;
                teamList = value.teams===undefined? [] : value.teams;
              // });
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

      let client = _WorkItemRestClient.getClient();
      client.getRelationTypes().then(function(relationsTypes) {
        relationsTypes.forEach(function(element) {
          // Limit to Child link type
          if (
            element.attributes.enabled === true &&
            element.referenceName == "System.LinkTypes.Hierarchy-Forward"
          ) {
            $("select.linkdialog-linktype-select").append(
              $("<option>", {
                selected: true,
                value: element.referenceName,
                text: element.name
              })
            );
          }
        });
        refreshWITCategory();
      });

      $("select.linkdialog-project-select").on("change", projectChanged);

      // $("select.linkdialog-team-select").on("change", inputChanged);

      $("select.linkdialog-linktype-select").on("change", inputChanged);

      $("select.linkdialog-wittype-select").on("change", inputChanged);

      $("input#dialog-label").on("change", inputChanged);

      $("textarea#comment").on("change", inputChanged);

      $("textarea#description").on("change", inputChanged);

      return _WidgetHelpers.WidgetStatusHelper.Success();
    },

    getProjects: function() {
      return getProjects();
    },

    getTeams: function(teamName) {
      return getTeams(teamName);
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