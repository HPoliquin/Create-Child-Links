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
import { ProjectInfo } from "TFS/Core/Contracts";

interface Window {
  MSInputMethodContext?: any;
}

declare var window: Window;

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
var projectList:IProjectInfo[] = [];
var teamList = [];

// // Build absolute contribution ID for dialogContent

// Build absolute contribution ID for dialogContent
var contributionId =
  extensionCtx.publisherId +
  "." +
  extensionCtx.extensionId +
  ".configuration-form-page";

var isIE11 = !!window.MSInputMethodContext && !!document.DOCUMENT_NODE;

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

function teamIncludedChanged()
{
  if(isIE11)
  {
    teamList = [];
    $('select.linkdialog-project-team-included-select option:selected').each(function()
    {
      teamList.push($(this).val());
    }); 
  } 
  else
  {
    let teamSelect = document.querySelector("select.linkdialog-project-team-included-select");
    teamList = M.FormSelect.getInstance(teamSelect).getSelectedValues(); 
  }

  // Execute registered callbacks
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i](isValid());
  }
  
}

// function projectTeamIncludedSelected() {
//   let teamSelect = $("select.linkdialog-project-team-included-select");
//   teamSelect.find("optgroup").each(function(optGroup) {
//     let projectID = $(optGroup).attr("value");
//     $(optGroup).find("option").each(function(myOption) {
//       console.log("team-included selection :", projectID, myOption);
//       if($(myOption).attr("selected")){

//       }
//     })
//   })

//   //console.log("Team selected: ", this, $(this), teamId);


//   // Execute registered callbacks
//   for (var i = 0; i < callbacks.length; i++) {
//     callbacks[i](isValid());
//   }
  
// }



function isValid() {
  // if(!isIE11)
  // {
  //   let teamSelect = document.querySelector("select.linkdialog-project-team-included-select");
  //   teamList = M.FormSelect.getInstance(teamSelect).getSelectedValues(); 
  // }


  return projectList.length > 0 && teamList.length > 0;
}

function getFormData() {
  // Get form values
  // let ProjectSelected:IProjectInfo[] = [];
  // $.each($("select.linkdialog-project-included-select option"), function() {
  //   let option : IProjectInfo = {
  //     project : $(this).text(),
  //     projectId : $(this).val(),
  //     teams : []
  //   }
  //   ProjectSelected.push(option);
  // });

  // let teamSelect = document.querySelector("select.linkdialog-project-team-included-select");
  // teamList = M.FormSelect.getInstance(teamSelect).getSelectedValues();

  teamList = [];
  if(isIE11)
  {
    $('select.linkdialog-project-team-included-select option:selected').each(function()
    {
      teamList.push($(this).val());
    }); 
  } 
  else
  {
    let teamSelect = document.querySelector("select.linkdialog-project-team-included-select");
    teamList = M.FormSelect.getInstance(teamSelect).getSelectedValues(); 
  }

  let myConfig:IConfigurationInfo = { projects: projectList, teams: teamList};
  console.log("myConfig: ", myConfig);
  return {
    ProjectIncluded: myConfig
  };
}

function isProjectIncluded(aProject) {
  //return projectList.indexOf(aProject.id) > -1;

  let projectFound = false;
  for( var i = 0; i < projectList.length; i++){ 
    if ( projectList[i].projectId === aProject) {
      projectFound = true;
      break;
    }
  }

  return projectFound;  

}

function isProjectTeamIncluded(aTeam: string) {
  let teamFound = false;
  // for( var i = 0; i < projectList.length; i++){ 
    // if ( projectList[i].projectId === aProject) {
    //   for( var t = 0; i < projectList[i].teams.length; i++){ 
    //     if ( projectList[i].teams[t].teamId === aTeam) {
    //       teamFound = true;
    //       break;
    //     }
    //   }
    //   break;
    // }
  // }

  for( var i = 0; i < teamList.length; i++){
    if ( teamList[i] === aTeam) {
      teamFound = true;
      break;
    }
  }

  return teamFound;  
}

function removeProjectTeam(aTeam: string) {
  for( var t = 0; t < teamList.length; t++){ 
    if ( teamList[t] === aTeam) {
      teamList.splice(t, 1);
      break;
    }
  }
  // for( var i = 0; i < projectList.length; i++){ 
  //   if ( projectList[i].projectId === aProject) {
  //     for( var t = 0; i < projectList[i].teams.length; i++){ 
  //       if ( projectList[i].teams[t].teamId === aTeam) {
  //         projectList[i].teams.splice(t, 1);
  //         break;
  //       }
  //     }
  //     break;
  //   }
  // }
}

function addProjectTeam(team: ITeamInfo) {
  if(!isProjectTeamIncluded(team.teamId))
  {
    teamList.push(team.teamId);
  }
}

var selectTeamInstance;
function refreshTeamsSelect() 
{
  if(!isIE11)
  {
    var elems = document.querySelector('select.linkdialog-project-team-included-select');
    selectTeamInstance = M.FormSelect.init(elems); 

    $("li.optgroup-option").on("click", teamIncludedChanged);
    
  }
  // var elems = document.querySelectorAll('select');
  // var options = document.querySelectorAll('option');
  // var instances = M.FormSelect.init(elems, options); //M.FormSelect.init(elems, options);
  // if(selectTeamInstance === undefined)
  // {
  //   selectTeamInstance = M.FormSelect.init(elems);    
  // } else {
  //   selectTeamInstance = M.FormSelect.getInstance(elems);
  // }

  // Execute registered callbacks
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i](isValid());
  }
}

function onAddedClick() {
    $.each($("select.linkdialog-project-select option:selected"), function() {
        $("select.linkdialog-project-included-select").append($("<option>", {
            value: $(this).val(),
            text: $(this).text()
          }));

        $("select.linkdialog-project-team-included-select").append($("<optgroup>", {
          value: $(this).val(),
          label: $(this).text()
        }));

        var projectDef:IProjectInfo = { project: $(this).text(), projectId: $(this).val()};
        projectList.push(projectDef);
        getTeams(projectDef);
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
        $("select.linkdialog-project-team-included-select").find("optgroup[label='" + $(this).text() + "']").remove();

        for( var i = 0; i < projectList.length; i++){ 
          if ( projectList[i].projectId === $(this).val()) {
            projectList.splice(i, 1);
            i--
          }
       }
    });

    refreshTeamsSelect();

    $("select.linkdialog-project-included-select").find("option:selected").remove()
    .end()
    .val("");

    projectChanged();
    projectIncludedChanged();
}


function getTeams(project: IProjectInfo)
{
  waitControl.startWait();

  var coreClient = _coreRestClient.getClient();
  coreClient.getTeams(project.projectId).then(
    function(teams) {
      if (teams !== undefined && teams.length > 0) {
        $("select.linkdialog-project-team-included-select")
          .find("optgroup[label='" + project.project + "'] option")
          .remove()
          .end();

          teams.forEach(function(team) {
            // console.log("Team trouvé : ", team.id, team.name);
            if (isProjectTeamIncluded(team.id)) {
              $("select.linkdialog-project-team-included-select").find("optgroup[label='" + project.project + "']").append(
                $("<option>", {
                  value: team.id,
                  text: team.name,
                  selected: true
                })
              );
            } else {
              $("select.linkdialog-project-team-included-select").find("optgroup[label='" + project.project + "']").append(
                $("<option>", {
                  value: team.id,
                  text: team.name
                })
              );
            }
          });
      }
      refreshTeamsSelect();
      waitControl.endWait();
    }, 
    function(reason) {
      console.log(reason);
      waitControl.endWait();
    }
  )

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

        $("select.linkdialog-project-team-included-select")
          .find("optgroup")
          .remove()
          .end()
          .val("");


        projects.sort(function(project1, project2) {
          return project2.name.toUpperCase() < project1.name.toUpperCase() ? 1 : -1;
        })

        projects.forEach(function(project) {
          if (isProjectIncluded(project.id)) {
            $("select.linkdialog-project-included-select").append(
              $("<option>", {
                value: project.id,
                text: project.name
              })
            );
            $("select.linkdialog-project-team-included-select").append($("<optgroup>", {
              value: project.id,
              label: project.name
            }));
            let _projectInfo: IProjectInfo = {project: project.name, projectId: project.id};
            getTeams(_projectInfo);
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
            console.log("Configuration loaded: ", value);
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

      $("select.linkdialog-project-select").on("change", projectChanged);

      $("select.linkdialog-project-included-select").on(
        "change",
        projectIncludedChanged
      );

      if(isIE11)
      {
        $("select.linkdialog-project-team-included-select").on(
          "change",
          teamIncludedChanged
        ); 
      }

      // $("select.linkdialog-project-team-included-select").on(
      //   "change",
      //   projectTeamIncludedSelected
      // );

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
