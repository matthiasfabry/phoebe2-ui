import React, { Component } from 'react';
import {Link, BrowserRouter, HashRouter, useParams} from 'react-router-dom';

import Select from 'react-select'; // https://react-select.com/home
import makeAnimated from 'react-select/animated';
const animatedComponents = makeAnimated();

import Papa from 'papaparse'; // https://www.npmjs.com/package/papaparse

import isElectron from 'is-electron'; // https://github.com/cheton/is-electron

// use native browser implementation if it supports aborting, otherwise use polyfill and whatwg-fetch
import 'abortcontroller-polyfill';
import {fetch} from 'whatwg-fetch';
export const abortableFetch = ('signal' in new Request('')) ? window.fetch : fetch

let versionCompare = require('semver-compare');  // function that returns -1, 0, 1

// let BrowserWindow;
// if (isElectron()) {
//   BrowserWindow = window.require('electron').remote.BrowserWindow
// } else {
//   BrowserWindow = null;
// }

export function withRouter(Children){
   return (props)=>{

      const match = {params: useParams()};
      return <Children {...props}  match={match}/>
  }
}

export function isStaticFile() {
  return window.location.pathname.includes('index.html')
}

export function randomstr(N) {
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < N; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

export function getServerWarning(phoebeVersion) {
  let serverWarning = null
  // If a client ever needs to raise a warning for an old version of the server
  // but doesn't quite justify raising serverMinVersion, that logic should go
  // here, based on this.state.phoebeVersion.
  // This obviously only knows about releases of PHOEBE when the current version
  // of the client was released.  To handle warnings for NEWER versions of PHOEBE
  // edit client_warning in phoebe2/client-server/phoebe-server
  if (phoebeVersion === null || versionCompare(phoebeVersion, '2.3.0') < 0) {
    serverWarning = 'phoebe-server with version '+phoebeVersion+' is before initial UI release'
  } else if (phoebeVersion === 'devel') {
    serverWarning = 'phoebe-server running a development version of PHOEBE, use with caution'
  }

  return serverWarning
}

export function generatePath(serverHost, bundleid, action, search) {
  let url = "/"
  // if (isStaticFile()) {prefix = "#"}

  if (serverHost) {
    url += serverHost
  }
  if (bundleid) {
    url += "/"+bundleid
  }
  if (action) {
    url += "/"+action
  }
  if (search) {
    url += search
  }
  return url
}

function processLink(link) {
  if (link.startsWith("http") || link.startsWith("ftp")) {
    return link
  }

  if (!link.startsWith("#")) {
    if (!link.startsWith("/")) {
      link = "/" + link
    }
    if (!link.startsWith(process.env.PUBLIC_URL)) {
      link = process.env.PUBLIC_URL + link
    }
  }
  return link
}

export function mapObject(object, callback) {
  return Object.keys(object).map(function (key) {
    return callback(key, object[key]);
  });
}

export function sameLists(_arr1, _arr2) {
  // https://stackoverflow.com/questions/6229197/how-to-know-if-two-arrays-have-the-same-values
  if (!Array.isArray(_arr1) || ! Array.isArray(_arr2) || _arr1.length !== _arr2.length)
    return false;

  let arr1 = _arr1.concat().sort();
  let arr2 = _arr2.concat().sort();

  for (let i = 0; i < arr1.length; i++) {

      if (arr1[i] !== arr2[i])
          return false;

  }

  return true;
}

export function popUpWindow(url, search) {
  let win;
  if (isElectron()) {
    // set frame: false?
    url = window.location.origin + window.location.pathname + search + "#" + url
    win = new BrowserWindow({width: 600, height: 400, minWidth: 325, minHeight: 200,
                            webPreferences: {
                              nodeIntegration: true, // needed for window.require
                            }});
    win.on('close', () => {win = null});
    win.loadURL(url);
    win.show();
  } else {
    if (isStaticFile()) {
      url = window.location.origin + window.location.pathname + search + "#" + url
    } else {
      url += search
    }

    let windowName = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    win = window.open(url,
                      windowName,
                      'height=400,width=600,left=50,top=20,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=no');
    win.focus();
  }

  return win

}

// export function filterObject(object, callback) {
  // return Object.keys(object).filter(function (key) {
    // return callback(key, object[key]);
  // })
// }

export function filterObjectByKeys (object, keys) {
  return Object.keys(object).reduce((accum, key) => {
    if (keys.includes(key)) {
      return { ...accum, [key]: object[key] }
    } else {
      return accum
    }
  }, {})
}

export class MyRouter extends Component {
  render() {
    if (isStaticFile() || isElectron()) {
      return (
        <HashRouter >{this.props.children}</HashRouter>
      )
    } else {
      return (
        <BrowserRouter >{this.props.children}</BrowserRouter>
      )
    }
  }
}

export class MyLink extends Component {
  render() {
    let to = this.props.to
    if (!to) {
      return (
        <a >{this.props.children}</a>
      )
    }
    return (
      <Link to={to}>{this.props.children}</Link>
    )
  }
}

export class Image extends Component {
  render() {
    let src = processLink(this.props.src)
    return (
      <img src={src}/>
    )
  }
}

export class CancelSpinnerIcon extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hover: false
    }
  }
  onCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (this.props.onCancel) {
      this.props.onCancel(e);
    }
  }
  render() {
    // onCancel

    let classes = "fas fa-fw"
    let style = {display: "inline-block", float: "left", marginTop: "4px", width: "20px", marginRight: "-20px", textAlign: "center", textDecoration: "none"}

    style.pointerEvents = "all"
    if (this.state.hover) {
      classes += " fa-times"
    } else {
      classes += " fa-circle-notch fa-spin"
    }

    return (
      <span style={style} className={classes} onClick={this.onCancel} onMouseEnter={()=>{this.setState({hover:true})}} onMouseLeave={()=>{this.setState({hover:false})}}/>
    )
  }
}

export class Twig extends Component {
  render() {

    let sliceIndex = this.props.twig.indexOf("@")

    if (this.props.paramOverview && this.props.paramOverview.time) {
      // then we want to select on the second @
      sliceIndex += this.props.twig.slice(sliceIndex+1).indexOf("@") + 1
    }

    let qualifier = this.props.twig.slice(0, sliceIndex);
    let twigRemainder = this.props.twig.slice(sliceIndex);

    return (
      <span style={{marginLeft: "4px"}} title={this.props.title}>
        <span style={{fontWeight: "bold"}}>{qualifier}</span>
        <span style={{fontWeight: "normal", color: "slategray"}}>{twigRemainder}</span>
      </span>
    )
  }
}


export class FileReader extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null,
      parsedData: null,
      parsedColumns: null,
      selectedColumns: {}, // keys: column key, values: uniqueid
      datasets: [],
    };
  }

  handleChange = event => {
    const file =  event.target.files[0];
    this.setState({file: file});
    Papa.parse(file, {
      skipEmptyLines: true,
      dynamicTyping: true,
      delimitersToGuess: [',', '\t', '|', ';', ' ', Papa.RECORD_SEP, Papa.UNIT_SEP],
      complete: this.updateData,
      header: true,
    });
  };

  componentDidMount() {
    this.setState({datasets: this.props.bundle.state.redirectArgs.datasets || []})
  }

  onChangeDatasets = (e) => {
    let value = []
    if (e) {
      value = e.map((item) => item.value)
    }
    this.setState({datasets: value})
  }
  updateData = (result) => {
    let data = result.data;
    this.setState({parsedData: data, parsedColumns: Object.keys(data[0]), selectedColumns: {}});
  }

  selectColumn = (e, d, column) => {
    console.log(e)
    console.log(d)
    let selectedColumns = this.state.selectedColumns
    // e.value is uniqueid
    // e.label is uniquetwig
    let value = null
    if (e !== null) {
      value = e.value
    }
    selectedColumns[column] = value
    this.setState({selectedColumns: selectedColumns})

    if (this.props.onUpdatePackets) {
      let packets = []
      let packet = {}
      mapObject(this.state.selectedColumns, (k,v) => {
        packet = {uniqueid: v}
        packet.value = this.state.parsedData.map(dataRow => dataRow[k])
        packets.push(packet)
      })
      this.props.onUpdatePackets(packets)
    }
  }

  render() {
    if (!this.props.bundle.state.params) {
      return null
    }

    let datasetChoices = []
    if (this.props.bundle.state.tags) {
      datasetChoices = this.props.bundle.state.tags.datasets || [];
    }
    let datasetChoicesList = datasetChoices.map((choice) => ({value: choice, label: choice}))
    let datasetList = this.state.datasets.map((choice) => ({value: choice, label: choice}))

    // do we want to ignore sample_periods@bls_period@solver?
    const ignore = ['ld_coeffs', 'ld_coeffs_bol', 'xlim', 'ylim', 'zlim', 'compute_times', 'compute_phases', 'mask_phases'];
    let availableParams = []
    mapObject(this.props.bundle.state.params, (uniqueid, param) => {
      if (param.class === 'FloatArrayParameter' && !param.readonly && param.component !== '_default' && ignore.indexOf(param.qualifier) === -1 && (this.state.datasets.length == 0 || this.state.datasets.indexOf(param.dataset) !== -1)) {
        availableParams.push({value: uniqueid, label: param.uniquetwig})
      }
    })

    return (
      <div>
        <div className="form-group">
          <label id={"file"} style={{width: "50%", textAlign: "right", paddingRight: "10px"}}>import from file</label>

          <input
            className="csv-input"
            type="file"
            ref={input => {
              this.filesInput = input;
            }}
            name="file"
            placeholder={null}
            onChange={this.handleChange}
          />
        </div>

        {this.state.parsedData ?
          <React.Fragment>
            <div className="form-group">
              <label id={"datasets"} style={{width: "50%", textAlign: "right", paddingRight: "10px"}}>filter choices by datasets</label>
              <span style={{width: "50%", lineHeight: "1.0", display: "inline-block", verticalAlign: "sub"}}>
                <Select options={datasetChoicesList} value={datasetList} onChange={this.onChangeDatasets} defaultMenuIsOpen={false} isMulti={true} isClearable={true} closeMenuOnSelect={false} components={animatedComponents}/>
              </span>
            </div>

            <div className="csv-parsed-columns" style={{}}>
              {this.state.parsedColumns.map( column => {
                return <div style={{display: "inline-block", padding: "0px", margin: "20px", width: "calc(33% - 40px)"}}>
                          <Select isClearable={true} options={availableParams}  onChange={(e, d) => this.selectColumn(e, d, column)}/>
                          {/*  TODO: add units Select based on chosen parameter */}
                          {/* TODO: allow common conversions to_time and mag_to_flux? */}

                          <div style={{overflowX: "scroll"}}>
                            <div><b>{column}</b></div>
                            {this.state.parsedData.slice(0,10).map(dataRow => <div>{dataRow[column]}</div>)}
                          </div>
                      </div>
              })}
            </div>
          </React.Fragment>
          :
          null
        }

      </div>
    );
  }
}

export default FileReader;
