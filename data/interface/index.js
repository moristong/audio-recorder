var config  = {
  "count": 0,
  "data": [],
  "stream": {},
  "elements": {},
  "recorder": null,
  "permission": {},
  "time": {
    "stop": 0,
    "start": 0
  },
  "page": {
    "microphone": "chrome://settings/content/microphone",
    "convert": "https://webbrowsertools.com/convert-to-mp3/"
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "duration": function (ms) {
    var date = new Date(null);
    date.setSeconds(ms / 1000);
    /*  */
    return date.toISOString().slice(11, 19);
  },
  "size": function (s) {
    if (s) {
      if (s >= Math.pow(2, 30)) {return (s / Math.pow(2, 30)).toFixed(1) + " GB"};
      if (s >= Math.pow(2, 20)) {return (s / Math.pow(2, 20)).toFixed(1) + " MB"};
      if (s >= Math.pow(2, 10)) {return (s / Math.pow(2, 10)).toFixed(1) + " KB"};
      return s + " B";
    } else return '';
  },
  "app": {
    "start": async function () {
      config.permission.microphone = config.storage.read("microphone-permission") !== undefined ? config.storage.read("microphone-permission") : true;  
      microphone.checked = config.permission.microphone;
      /*  */
      var action = document.querySelector(".action");
      await new Promise((resolve, reject) => {window.setTimeout(resolve, 300)});
      action.removeAttribute("loading");
    },
    "stop": {
      "microphone": function () {
        var tracks = config.stream.combine.getTracks();
        for (var i = 0; i < tracks.length; i++) {
          tracks[i].stop();
          config.stream.combine.removeTrack(tracks[i]);
        }
        /*  */
        if (config.recorder && config.recorder.state !== "inactive") {
          delete config.stream.combine;
          config.recorder.stop();
          config.data = [];
        }
      }
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          var current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      var context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            /*  */
            chrome.runtime.connect({
              "name": config.port.name
            });
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          var tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "listener": {
    "data": function (e) {
      config.data.push(e.data);
    },
    "stop": function () {
      var a = document.createElement('a');
      var li = document.createElement("li");
      var spansize = document.createElement("span");
      var spanduration = document.createElement("span");
      var filename = (new Date()).toString().slice(0, 24);
      var blob = new Blob(config.data, {"type": "audio/webm"});
      var duration = new Date(config.time.end - config.time.start);
      /*  */
      a.textContent = filename + " 🠯";
      a.href = URL.createObjectURL(blob);
      li.textContent = "#" + (++config.count);
      spansize.textContent = config.size(blob.size);
      spanduration.textContent = config.duration(duration.getTime());
      a.download = "Audio " + filename.replace(/ /g, '-').replace(/:/g, '-') + ".webm";
      /*  */
      li.appendChild(a);
      li.appendChild(spansize);
      li.appendChild(spanduration);
      list.appendChild(li);
      /*  */
      config.app.stop.microphone();
      window.setTimeout(function () {a.click()}, 300);
    },
    "start": async function () {
      config.elements.info.microphone.removeAttribute("denied");
      /*  */
      if (navigator.mediaDevices) {
        try {
          config.stream.combine = await navigator.mediaDevices.getUserMedia({
            "video": false, 
            "audio": config.permission.microphone
          });
          /*  */
          if (config.stream.combine) {
            var player = document.getElementById("player");
            player.srcObject = config.stream.combine;
          }
        } catch (e) {
          var b = await navigator.permissions.query({"name": "microphone"});
          var d = b.state === "denied" && config.permission.microphone === true;
          /*  */
          var error = '';
          if (d) error = "Microphone permission is denied!\nPlease adjust the permission and try again.";
          else if (config.permission.microphone === false) error = "Please mark the - Access Microphone - checkbox and try again."
          else error = "An error has occurred, please try again.";
          /*  */
          window.alert(error);
          /*  */
          if (config.port.name !== "webapp") {
            if (b.state === "denied") {
              config.elements.info.microphone.setAttribute("denied", '');
              chrome.tabs.create({"url": config.page.microphone, "active": true});
            }
          }
        }
      } else {
        window.alert("Error! navigator.mediaDevices is not available!");
      }
    }
  },
  "load": function () {
    var stop = document.getElementById("stop");
    var start = document.getElementById("start");
    var player = document.getElementById("player");
    var reload = document.getElementById("reload");
    var action = document.querySelector(".action");
    var convert = document.getElementById("convert");
    var support = document.getElementById("support");
    var donation = document.getElementById("donation");
    var microphone = document.getElementById("microphone");
    /*  */
    config.elements.info = {};
    config.elements.info.microphone = document.getElementById("microphone-permission");
    /*  */
    reload.addEventListener("click", function () {
      document.location.reload();
    });
    /*  */
    microphone.addEventListener("change", function (e) {
      config.permission.microphone = e.target.checked;
      config.storage.write("microphone-permission", config.permission.microphone);
    });
    /*  */
    convert.addEventListener("click", function () {
      var url = config.page.convert;
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    config.elements.info.microphone.addEventListener("click", function () {
      var url = config.page.microphone;
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    support.addEventListener("click", function () {
      if (config.port.name !== "webapp") {
        var url = config.addon.homepage();
        chrome.tabs.create({"url": url, "active": true});
      }
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      if (config.port.name !== "webapp") {
        var url = config.addon.homepage() + "?reason=support";
        chrome.tabs.create({"url": url, "active": true});
      }
    }, false);
    /*  */
    stop.addEventListener("click", function () {
      action.removeAttribute("recording");
      /*  */
      if (config.recorder) {
        player.pause();
        player.currentTime = 0;
        player.srcObject = null;
        config.time.end = new Date();
        if (config.recorder) config.recorder.stop();
      }
    });
    /*  */
    start.addEventListener("click", async function () {
      action.setAttribute("loading", '');
      await config.listener.start();
      await new Promise((resolve, reject) => {window.setTimeout(resolve, 300)});
      action.removeAttribute("loading");
      /*  */
      if (config.stream.combine) {
        if (config.stream.combine.active) {
          config.recorder = new MediaRecorder(config.stream.combine, {"mimeType": "audio/webm"});
          config.recorder.addEventListener("dataavailable", config.listener.data);
          config.recorder.addEventListener("stop", config.listener.stop);
          /*  */
          if (config.recorder) {
            action.setAttribute("recording", '');
            config.time.start = new Date();
            config.recorder.start();
            player.play();
          }
        }
      }
    });
    /*  */
    action.setAttribute("loading", '');
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);