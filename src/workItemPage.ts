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
  // let project = $("select.linkdialog-project-select").val();
  // if (project !== undefined && project !== null && project.length > 0) {
  //   getTeams(project);
  // }
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

  // let teamIndex = $("select.linkdialog-team-select").prop("selectedIndex");

  let linkTypeIndex = $("select.linkdialog-linktype-select").prop(
    "selectedIndex"
  );
  let wittTpeIndex = $("select.linkdialog-wittype-select").prop(
    "selectedIndex"
  );
  let titreLength = $("input#dialog-label").val().length;

  return (
    projectIndex > 0 &&
    // teamIndex > 0 &&
    linkTypeIndex >= 0 &&
    wittTpeIndex >= 0 &&
    titreLength > 0
  ); //confirm("Est-ce Valid?");//!!(name.value) && !!(dateOfBirth.value) && !!(email.value);
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

  // Project: $("select.linkdialog-project-select option:selected").text(),
  // ProjectId: $("select.linkdialog-project-select option:selected").val(),

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

// function teamAllowed(projectName: string, teamName: string) {
  // if(projectName == "DSD - Administration des bases de données")
  // {
  //   return teamName == "Administration des bases de données";
  // }
  // else if(projectName == "DSD - Soutien au développement")
  // {
  //   return teamName == "DSD - Soutien au développement";
  // } else {
  //   return true;
  // }

//}

function isProjectIncluded(aProject: string) {
  let projectFound = false;
  for( var i = 0; i < projectList.length; i++){ 
    if ( projectList[i].projectId === aProject) {
      projectFound = true;
      break;
    }
  }

  return projectFound;  
  // return projectList.includes(aProject.id);
  // return projectList.indexOf(aProject.id) > -1;
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
          .append("<option>Choisir le projet</option>")
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
            // $("select.linkdialog-project-select").append(
            //   $("<option>", {
            //     value: project.id,
            //     text: project.name
            //   })
            // );
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

function getTeams(targetProjectId) {
  if (
    targetProjectId !== undefined &&
    targetProjectId.length > 0 &&
    targetProjectId !== "Choisir le projet"
  ) {
    waitControl.startWait();
    let client = _WorkItemRestClient.getClient();
    //var targetProjectId = "DSD";
    let coreClient = _coreRestClient.getClient();
    coreClient.getProject(targetProjectId).then(
      function(project) {
        coreClient.getTeams(project.id).then(
          function(teams) {
            $("select.linkdialog-project-select")
              .find("optgroup[label='" + project.name + "'] option")
              .remove()
              .end();

            // $("select.linkdialog-team-select")
            //   .find("option")
            //   .remove()
            //   .end()
            //   .append("<option>Choisir l'équipe</option>")
            //   .val("");

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
          },
          function(reason) {
            $("select.linkdialog-project-select")
              .find("optgroup[label='" + project.name + "'] option")
              .remove()
              .end()
              .val("");
          }
        );

        client.getWorkItemTypeCategories(project.id).then(
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

            // var category = witCategories.find(function(category) { category.referenceName == "Microsoft.RequirementCategory"});
            let witTypeAdded = 0;
            if (category != undefined || category.workItemTypes.length == 0) {
              $("select.linkdialog-wittype-select")
                .find("option")
                .remove()
                .end()
                .val("");

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
              client.getWorkItemTypes(project.id).then(function(witTypes) {
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
            waitControl.endWait();
          },
          function(reason) {
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

            // $.each(myProjectList, function(key:string, value: [IProjectInfo]) {
            //   $.each(value, function(index, elementValue) {
            //     projectList.push(elementValue.projectId)
            //   });
            // });
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

// // that currently is displayed in the UI).
// function getWorkItemFormService()
// {
//     return _WorkItemServices.WorkItemFormService.getService();
// }

// $("#name").text(VSS.getWebContext().user.name);
// $("div.title div.la-user-icon").text(VSS.getWebContext().user.name + " <" + VSS.getWebContext().user.uniqueName + ">");

// getWorkItemFormService().then(function(service) {
//     service.getFieldValues(["System.Id", "System.Title", "System.ChangedDate", "System.State", "System.WorkItemType"]).then(function(myFields) {
//         $("div.title div.la-primary-data-id").text(myFields["System.Id"]);
//         $("div.title div.la-primary-data-title").text(myFields["System.Title"]);
//         $("div.title span.la-primary-data-modified").text("Mise à jour de " + new Date(myFields["System.ChangedDate"]).toLocaleDateString());
//         $("div.title span.la-primary-data-state").text(myFields["System.State"]);
//         $("div.title div.la-primary-data-title").html(myFields["System.WorkItemType"]);
//     });
// });
