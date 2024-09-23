import React, { Component } from 'react';
import { redirect } from 'react-router-dom';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// minified version is also included
// import 'react-toastify/dist/ReactToastify.min.css';

// import isElectron from 'is-electron'; // https://github.com/cheton/is-electron
import {PanelGroup} from 'rsuite'; // https://www.npmjs.com/package/react-panelgroup
import {arrayMove} from '@dnd-kit/sortable';

// will need to move to array-move if updating react-sortable-hoc, but
// currently causes npm run build to fail
// const arrayMove = require('array-move'); // https://www.npmjs.com/package/array-move

import {TagPanel} from './panel-tags';
import {PSPanel} from './panel-ps';
import {ActionPanel} from './panel-action';
import {FigurePanel} from './panel-figures';
import {generatePath, abortableFetch, mapObject, sameLists, withRouter} from './common';
import {Toolbar, Statusbar} from './ui';


class Bundle extends Component {
  constructor(props) {
    super(props);
    this.state = {
      redirect: null,
      bundleid: props.match.params.bundleid,
      params: null,
      paramsAllowDist: {},
      figures: [],
      figureUpdateTimes: {},
      failedConstraints: [],
      checksReport: [],
      checksStatus: "UNKNOWN",
      paramsfilteredids: [],
      tags: {},
      tagsAvailable: {},
      nAdvancedHiddenEach: {},
      nAdvancedHiddenTotal: 0,
      nparams: 0,
      undoDescription: null,
      undoIndex: null,
      pendingBundleMethod: null,
      pollingJobs: {}, // uniqueid: interval
      redirectArgs: {},
    };
    this.childrenWindows = [];
  }
  // getUpdatedSearchString = (updates) => {
  //   this.props.app.setQueryParams(updates)
  //   return this.getSearchString()
  // }
  registerBundle = () => {
    console.log("registerBundle")
    this.emit('register client', {});

    this.props.app.socket.on(this.state.bundleid+':errors:react', (data) => {
      if (this.state.pendingBundleMethod) {
        toast.update(this.state.pendingBundleMethod, {
          render: "FAILED: "+data.error,
          type: toast.TYPE.ERROR,
          autoClose: false,
          closeButton: true})

        this.setState({pendingBundleMethod: null})

      } else {
        let level = data.level || 'ERROR'
        let toastLevel = toast.error
        if (level.toUpperCase() === 'WARNING') {
          toastLevel = toast.warning
        }
        toastLevel(level.toUpperCase()+': '+data.error, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true})

      }

    })

    this.props.app.socket.on(this.state.bundleid+':checks:react', (data) => {
      this.setState({checksReport: data.checks_report || [], checksStatus: data.checks_status || "UNKNOWN"})
    })

    this.props.app.socket.on(this.state.bundleid+':failed_constraints:react', (data) => {
      this.setState({failedConstraints: data.failed_constraints || []})
    })

    this.props.app.socket.on(this.state.bundleid+':figures_updated:react', (data) => {
      // console.log(data)
      let figureUpdateTimes = this.state.figureUpdateTimes
      Object.keys(data.figure_update_times).forEach( figure => {
        figureUpdateTimes[figure] = data.figure_update_times[figure]
      })
      this.setState({figureUpdateTimes: figureUpdateTimes})
    })

    this.props.app.socket.on(this.state.bundleid+':undo:react', (data) => {
      this.setState({undoIndex: data.undo_index, undoDescription: data.undo_description})
    })

    this.props.app.socket.on(this.state.bundleid+':changes:react', (data) => {
      // console.log("received changes", data)
      if (data.parameters) {
        let params = this.state.params;
        Object.keys(data.parameters).forEach( uniqueid => {
          // console.log("updating "+data.parameters[uniqueid].uniquetwig)
          params[uniqueid] = data.parameters[uniqueid];
        });
        let removed_params = data.removed_parameters || []
        removed_params.forEach( uniqueid => {
          delete params[uniqueid];
        })
        this.setState({params: params});
      }

      if (data.params_allow_dist) {
        this.setState({paramsAllowDist: data.params_allow_dist})
      }


      if (data.tags) {
        this.setState({tags: data.tags});

        // update figures
        let figures = this.state.figures
        for (const figure of data.tags.figures) {
          if (figures.indexOf(figure) === -1) {
            figures.push(figure)
          }
        }
        figures.forEach( (figure,i) => {
          // likewise if there is a figure that is no longer in data.tags.figures, we need to remove
          if (data.tags.figures.indexOf(figure) === -1) {
            figures.splice(i, 1)
          }
        })
        this.setState({figures: figures})

        let figureUpdateTimes = this.state.figureUpdateTimes
        Object.keys(figureUpdateTimes).forEach( figure => {
          if (figures.indexOf(figure) === -1) {
            // then this figure has been removed, so we need to remove it from figureUpdateTimes
            delete figureUpdateTimes[figure]
          }
        })
        this.setState({figureUpdateTimes: figureUpdateTimes})

      }


      if (data.add_filter) {

        let filterstr = ''
        for (const [key, value] of Object.entries(data.add_filter)) {
          filterstr += key+ ' = '+value
        }

        let onClick = (e) => {this.props.app.clearQueryParams(); this.props.app.setQueryParams(data.add_filter)}

        if (this.state.pendingBundleMethod) {
          toast.update(this.state.pendingBundleMethod, {
            render: 'Success!',
            type: toast.TYPE.SUCCESS,
            autoClose: 1000,
            closeButton: true,
            closeOnClick: true})

          // we'll let the waiting panel-action clear the pendingBundleMethod once it updates the view
          this.props.app.setQueryParams({tmp: '"'+Object.keys(data.add_filter)[0]+':'+Object.values(data.add_filter)[0]+'"'})

        } else {
          toast.info('New parameters.  Click to filter: '+filterstr+'.', {
            position: "bottom-right",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            onClick: onClick})

        }
      } else if (this.state.pendingBundleMethod) {
        toast.update(this.state.pendingBundleMethod, {
          render: 'Success!',
          type: toast.TYPE.SUCCESS,
          autoClose: 1000,
          closeButton: true,
          closeOnClick: true})

        this.setState({pendingBundleMethod: null})


      }

      // TODO: do we ever need to be worried about the state not being updated yet?
      this.updatePollingJobs(this.state.params)


    });

  }
  deregisterBundle = () => {
    console.log("deregisterBundle")
    this.emit('deregister client', {});

    // terminate any polling for jobs
    mapObject(this.state.pollingJobs, (jobid, interval) => {
      clearInterval(interval)
    })
    this.setState({pollingJobs: {}})

  }
  componentDidMount() {
    window.addEventListener("beforeunload", (event) => {this.closePopUps()});

    if (this.props.app.queryParams.disconnectButton && !this.props.app.state.allowDisconnectReadonly) {
      this.props.app.setState({allowDisconnectReadonly: true})
    }

    // clear any temporary transfer bundle from the app
    this.props.app.setState({bundleTransferJson: null})

    this.abortGetParamsController = new window.AbortController();

    abortableFetch("http://"+this.props.app.state.serverHost+"/bundle/"+this.state.bundleid, {
      signal: this.abortGetParamsController.signal, method: 'POST', headers: {"content-type": "application/json"},
      body: JSON.stringify({clientid: this.props.app.state.clientid, client_version: this.props.app.state.clientVersion})})
      .then(res => res.json())
      .then(json => {
        if (json.data.success) {
          this.registerBundle();
          let figureUpdateTimes = {}
          json.data.tags.figures.forEach( (figure) => {
            // NOTE: this will show an empty icon if failed (ie no data or model);
            // so as soon as we set this we'll request all to be updated
            figureUpdateTimes[figure] = 'load'
          });
          this.setState({params: json.data.parameters,
                         tags: json.data.tags,
                         paramsAllowDist: json.data.params_allow_dist,
                         figures: json.data.tags.figures,
                         figureUpdateTimes: figureUpdateTimes,
                         failedConstraints: json.data.failed_constraints,
                         checksStatus: json.data.checks_status || "UNKNOWN",
                         checksReport: json.data.checks_report || [],
                         nparams: Object.keys(json.data.parameters).length})

          this.updatePollingJobs(json.data.parameters);
          this.emit('rerun_all_figures', {});
        } else if (!window.electronAPI.getArgs().w) {
          alert("server error: "+json.data.error);
          this.setState({params: null, tags: null, figures: [], failedConstraints: [], checksStatus: "UNKNOWN", checksReport: null, nparams: null});
          this.props.app.clearQueryParams();
          this.deregisterBundle();
          this.setState({redirect: generatePath(this.props.app.state.serverHost)})
          // this.cancelLoadBundleSpinners();
        }
      }, err => {
        // then we canceled the request
        console.log("received abort signal", err)
        // this.cancelLoadBundleSpinners();
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          // then we canceled the request
          console.log("received abort signal")
          // this.cancelLoadBundleSpinners();
          this.setState({bundleid: null, params: null, tags: null, nparams: 0});
          this.props.app.clearQueryParams();
          this.deregisterBundle();
          this.setState({redirect: generatePath(this.props.app.state.serverHost)})
        } else {
          alert("server error, try again")
          // this.cancelLoadBundleSpinners();
          // alert("redirecting to server splash")
          this.setState({redirect: generatePath(this.props.app.state.serverHost)})

          // this.setState({bundleid: null, params: null, tags: null, nparams: 0});
          // this.props.app.clearQueryParams();
          // this.deregisterBundle();
        }


      });
  }
  componentWillUnmount() {
    this.closePopUps();
    this.deregisterBundle();
  }
  closePopUps = () => {
    this.childrenWindows.forEach(win => {
      try {
        win.close();
      } catch(error) {
        console.log("failed to close window")
      }
    })
    this.childrenWindows = [];
  }
  inAdvanced = (param, advanced) => {
    const advancedAll = ['not_visible', 'is_default', 'is_advanced', 'is_single', 'is_constraint'];
    let inAdvanced = []
    for (let i=0; i<advancedAll.length; i++) {
      if (advanced.indexOf(advancedAll[i]) === -1 && param.advanced_filter.indexOf(advancedAll[i]) !== -1) {
        inAdvanced.push(advancedAll[i])
      }
    }
    return inAdvanced
  }
  pollJob = (uniqueid) => {
    console.log("polling for "+uniqueid)

    this.emit('bundle_method', {method: 'attach_job', uniqueid: uniqueid});
  }
  updatePollingJobs = (params) => {
    let pollingJobs = [];
    mapObject(params, (uniqueid, param) => {
      if (Object.keys(this.state.pollingJobs).indexOf(uniqueid) === -1) {
        if (param.qualifier === 'detached_job' && ['loaded', 'error', 'killed'].indexOf(param.valuestr) === -1) {
          // then we need to poll for updates to this parameter
          // console.log("adding polling interval for detached_job "+uniqueid+" with status "+param.valuestr)
          let interval = setInterval(() => this.pollJob(uniqueid), 1000);
          pollingJobs[uniqueid] = interval
        }
      } else {
        if (param.qualifier === 'detached_job' && ['loaded', 'error', 'killed'].indexOf(param.valuestr) === -1) {
          // then we leave the current interval in place
          pollingJobs[uniqueid] = this.state.pollingJobs[uniqueid]
        } else {
          // then we clear the existing interval
          console.log("clearing polling for "+uniqueid)
          clearInterval(this.state.pollingJobs[uniqueid])
          // and don't add an entry to the new state
        }
      }
    })

    this.setState({pollingJobs: pollingJobs})
  }
  onFigureSortEnd = ({oldIndex, newIndex}) => {
    this.setState({
      figures: arrayMove(this.state.figures, oldIndex, newIndex),
    });
  }
  filter = (params, filter, ignoreGroups=[]) => {
    let ignoreGroupsFilter = ignoreGroups.concat(["pinned", "advanced", "orderBy", "tmp", "checks", "lastActive", "disconnectButton"])

    let nAdvancedHiddenEach = {};
    let nAdvancedHiddenTotal = 0;
    let inAdvancedAll = null
    let paramsfilteredids = [];
    let includeThisParam = true;

    let advanced = filter.advanced || []

    if (filter.tmp!==undefined && filter.tmp.length) {
      // then this is a temporary filter (i.e. for the results from add_*)
      // syntax: tag1:value1|value2,tag2:value1
      const filterStrings = filter.tmp.split(',')
      let filterTmp = {}
      for (const filterString of filterStrings) {
        // console.log(filterString)
        let tmpFilterTag = filterString.split(':')[0].replace('%22', '')
        let tmpFilterValues = filterString.split(':')[1].replace('%22', '').split('|')
        tmpFilterValues = tmpFilterValues.map((item) => { return item === 'null' ? null : item; });
        // console.log(tmpFilterTag)
        // console.log(tmpFilterValues)
        filterTmp[tmpFilterTag] = tmpFilterValues

        // override the advanced setting for single-choices to always show in the tmpFilter
        advanced.push('is_single')
      }

      mapObject(params, (uniqueid, param) => {
        // determine initial visibility based on advanced filter
        includeThisParam = true;
        inAdvancedAll = param.advanced_filter;
        inAdvancedAll.forEach(advancedItem => {
          // we'll respect all of the advanced options except for 'is_constraint' (so that compute_phases/times constraint is shown)
          if (advanced.indexOf(advancedItem) === -1 && ['is_constraint'].indexOf(advancedItem) === -1) {
            includeThisParam = false;
          }
        })

        mapObject(filterTmp, (tmpFilterTag, tmpFilterValues) => {
          if ((tmpFilterTag==='uniqueid' && tmpFilterValues.indexOf(uniqueid) === -1) || (tmpFilterTag!=='uniqueid' && tmpFilterValues.indexOf(param[tmpFilterTag]) === -1)) {
            includeThisParam = false
          }
        })
        // if (tmpFilterValues.indexOf(param[tmpFilterTag]) === -1) {
          // includeThisParam = false
        // }

        if (includeThisParam) {
          paramsfilteredids.push(uniqueid)
        }
      })
      return [paramsfilteredids, null, null]
    }

    if (ignoreGroups.indexOf("advanced")!==-1 || advanced.indexOf("onlyPinned")===-1) {
      mapObject(params, (uniqueid, param) => {
        inAdvancedAll = param.advanced_filter;
        if (typeof inAdvancedAll === 'string') {
          inAdvancedAll = JSON.parse(inAdvancedAll.split('%27').join('"').split('%20').join(''))
        }

        // include this in counts
        inAdvancedAll.forEach(advancedItem => {
          if (Object.keys(nAdvancedHiddenEach).indexOf(advancedItem) === -1) {
            nAdvancedHiddenEach[advancedItem] = 0
          }
          nAdvancedHiddenEach[advancedItem] += 1
        })

        // determine initial visibility based on advanced filter
        includeThisParam = true;
        inAdvancedAll.forEach(advancedItem => {
          if (advanced.indexOf(advancedItem) === -1) {
            includeThisParam = false;
          }
        })

        if (!includeThisParam) {
          // then we need to add this param to the total count of excluded because of advanced filter
          nAdvancedHiddenTotal += 1;
        }

        mapObject(filter, (group, tags) => {
          if (typeof tags === 'string' && tags.indexOf('[') !== -1) {
            tags = JSON.parse(tags.split('%27').join('"').split('%20').join(''))
          }
          if (group === 'uniqueid' && tags.length) {
            // NOTE: this isn't used by the UI (pinning is instead), but is
            // used by the python-client to request certain parameters while
            // still obeying visibilities, etc
            if (tags.indexOf(uniqueid) === -1) {
              includeThisParam = false
            }
          } else if (ignoreGroupsFilter.indexOf(group)===-1 && tags.length && tags.indexOf(param[group])===-1){
            includeThisParam = false
          }
        })
        if (includeThisParam) {
          paramsfilteredids.push(uniqueid)
        }
      })
    }


    if (ignoreGroups.indexOf("pinned")===-1){
      let pinned = filter.pinned || []
      if (typeof pinned === 'string') {
        pinned = JSON.parse(pinned.split('%27').join('"').split('%20').join(''))
      }
      pinned.forEach(uniqueid => {
        if (paramsfilteredids.indexOf(uniqueid)===-1) {
          paramsfilteredids.push(uniqueid)
        }
      })
    }

    return [paramsfilteredids, nAdvancedHiddenEach, nAdvancedHiddenTotal];

  }
  componentDidUpdate() {
    if (this.state.params && this.props.app.queryParams) {
      console.log("Bundle.componentDidUpdate recomputing paramsfilteredids")

      // determine which parameters (by a list of uniqueids) is in the filtered PS
      let filteredInfo = this.filter(this.state.params, this.props.app.queryParams);
      let paramsfilteredids = filteredInfo[0];
      let nAdvancedHiddenEach = filteredInfo[1];
      let nAdvancedHiddenTotal = filteredInfo[2];

      if (paramsfilteredids.length !== this.state.paramsfilteredids.length || !sameLists(paramsfilteredids, this.state.paramsfilteredids)) {
        // since we're only allowing one tag to be added or removed, we can
        // hopefully rely that the length will change if the filter changes at all
        this.setState({paramsfilteredids: paramsfilteredids, nAdvancedHiddenEach: nAdvancedHiddenEach, nAdvancedHiddenTotal: nAdvancedHiddenTotal});

        // determine "availability" of all tags
        let tagsAvailable = {}
        let paramsfilteredids_thisgroup = null;
        mapObject(this.state.tags, (group, tags) => {
          // i.e. group='componnet', tags=['binary', 'primary', 'secondary']

          // determine filtered PS excluding this group
          paramsfilteredids_thisgroup = this.filter(this.state.params, this.props.app.queryParams, ["advanced", "pinned", group.slice(0,-1)])[0];

          // loop through all parameters in that filter and gather the tags in THIS group - this will be available, whether selected or not
          tagsAvailable[group] = []
          paramsfilteredids_thisgroup.forEach(uniqueid => {
            if (tagsAvailable[group].indexOf(this.state.params[uniqueid][group.slice(0,-1)])===-1) {
              tagsAvailable[group].push(this.state.params[uniqueid][group.slice(0,-1)]);
            }
          })
        });


        this.setState({tagsAvailable: tagsAvailable});
      }
    }

  }
  emit = (channel, packet) => {
    packet['bundleid'] = this.state.bundleid;
    return this.props.app.emit(channel, packet);
  }
  render() {
    if (this.state.redirect) {
      return (<redirect to={this.state.redirect}/>)
    }

    if (this.props.PSPanelOnly) {
      return (<PSPanel app={this.props.app} bundleid={this.state.bundleid} bundle={this} PSPanelOnly={this.props.PSPanelOnly}/>)
    } else if (this.props.FigurePanelOnly) {
      return (<FigurePanel app={this.props.app} bundleid={this.state.bundleid} bundle={this} showPopoutButton={false} FigurePanelOnly={this.props.FigurePanelOnly}/>)
    }

    let panelWidths = [
                      {size: 490, minSize:300, resize: "dynamic"},
                      {minSize:440, resize: "stretch"},
                      {size: 250, minSize:250, resize: "dynamic"}
                     ]

    return (
      <div className="App">
        <Toolbar app={this.props.app} bundle={this} bundleid={this.state.bundleid}/>
        <Statusbar app={this.props.app} bundle={this} bundleid={this.state.bundleid}/>

        <ToastContainer
          position="bottom-right"
          autoClose={10000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnVisibilityChange={false}
          pauseOnFocusLoss={true}
          draggable
          pauseOnHover
        />

        <div className="d-none d-lg-block" style={{paddingTop: "50px", paddingBottom: "28px", height: "100%"}}>
          {/* need to support down to width of 990 for d-lg.  Tag starts at width needed for 3 columns */}
          <PanelGroup panelWidths={panelWidths}>
            <TagPanel app={this.props.app} bundleid={this.state.bundleid} bundle={this} inactive={this.props.match.params.action}/>
            {this.props.match.params.action ?
              <ActionPanel app={this.props.app} bundleid={this.state.bundleid} bundle={this} action={this.props.match.params.action}/>
              :
              <PSPanel app={this.props.app} bundleid={this.state.bundleid} bundle={this} showPopoutButton={true} showChecks={!this.props.app.queryParams.hideChecks} checksReport={this.state.checksReport} checksStatus={this.state.checksStatus}/>
            }
            <FigurePanel app={this.props.app} bundleid={this.state.bundleid} bundle={this} showPopoutButton={true} inactive={this.props.match.params.action}/>
          </PanelGroup>
        </div>
        <div className="d-block d-lg-none" style={{paddingTop: "50px", paddingBottom: "28px", height: "100%"}}>
          <PSPanel app={this.props.app} bundleid={this.state.bundleid} bundle={this}/>
        </div>


      </div>
    )
  }
}

export default withRouter(Bundle)
