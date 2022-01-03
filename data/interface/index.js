var config  = {
  "count": 0,
  "data": [],
  "stream": {},
  "recorder": null,
  "time": {"start": 0, "stop": 0},
  "convert": {"page": "https://webbrowsertools.com/convert-to-mp3/"},
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "duration": function (ms) {
    var date = new Date(null);
    date.setSeconds(ms / 1000);
    return date.toISOString().substr(11, 8);
  },
  "size": function (s) {
    if (s) {
      if (s >= Math.pow(2, 30)) {return (s / Math.pow(2, 30)).toFixed(1) + " GB"};
      if (s >= Math.pow(2, 20)) {return (s / Math.pow(2, 20)).toFixed(1) + " MB"};
      if (s >= Math.pow(2, 10)) {return (s / Math.pow(2, 10)).toFixed(1) + " KB"};
      return s + " B";
    } else return '';
  },
  "stop": {
    "microphone": function () {
      var tracks = config.stream.audio.getTracks();
      for (var i = 0; i < tracks.length; i++) tracks[i].stop();
      if (config.recorder && config.recorder.state !== "inactive") {
        config.recorder.stop();
        config.data = [];
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
    "stop": function (e) {
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
      document.querySelector(".content div").style.background = "none";
      a.download = "Audio " + filename.replace(/ /g, '-').replace(/:/g, '-') + ".webm";
      /*  */
      li.appendChild(a);
      li.appendChild(spansize);
      li.appendChild(spanduration);
      list.appendChild(li);
      /*  */
      config.data = [];
    }
  },
  "load": function () {
    var stop = document.getElementById("stop");
    var audio = document.getElementById("audio");
    var record = document.getElementById("record");
    var reload = document.getElementById("reload");
    var cancel = document.getElementById("cancel");
    var support = document.getElementById("support");
    var convert = document.getElementById("convert");
    var donation = document.getElementById("donation");
    var player = document.getElementById("microphone");
    /*  */
    stop.disabled = true;
    record.disabled = true;
    cancel.disabled = true;
    /*  */
    reload.addEventListener("click", function () {
      document.location.reload();
    });
    /*  */
    convert.addEventListener("click", function () {
      var url = config.convert.page;
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
    cancel.addEventListener("click", function () {
      config.stop.microphone();
      /*  */
      player.pause();
      config.stream = {};
      stop.disabled = true;
      record.disabled = true;
      cancel.disabled = true;
      player.currentTime = 0;
      player.srcObject = null;
      audio.removeAttribute("disabled");
    });
    /*  */
    stop.addEventListener("click", function () {
      if (config.recorder) {
        player.pause();
        stop.disabled = true;
        player.currentTime = 0;
        config.time.end = new Date();
        record.removeAttribute('disabled');
        if (config.recorder) config.recorder.stop();
      }
    });
    /*  */
    record.addEventListener("click", function () {
      config.recorder = new MediaRecorder(config.stream.audio, {"mimeType": "audio/webm"});
      config.recorder.addEventListener("dataavailable", config.listener.data);
      config.recorder.addEventListener("stop", config.listener.stop);
      /*  */
      stop.removeAttribute("disabled");
      config.time.start = new Date();
      stop.style.color = "#e74c3c";
      config.recorder.start();
      record.disabled = true;
      player.play();
    });
    /*  */
    audio.addEventListener("click", async function () {
      if (navigator.mediaDevices) {
        audio.setAttribute("loading", '');
        /*  */
        navigator.mediaDevices.getUserMedia({"video": false, "audio": true}).then(function (e) {
          audio.disabled = true;
          config.stream.audio = e;
          audio.removeAttribute("loading");
          cancel.removeAttribute("disabled");
          record.removeAttribute("disabled");
          /*  */
          if (config.stream.audio) player.srcObject = config.stream.audio;
        }).catch(function (e) {
          audio.removeAttribute("loading");
          if (config.port.name !== "webapp") {
            window.alert("Microphone permission is denied!\nPlease adjust the permissions via the below address and try again.\nchrome://settings/content/microphone");
            /*  */
            if (config.port.name !== "webapp") {
              chrome.tabs.create({"url": "about://settings/content/microphone", "active": true});
            }
          }
        });
      } else {
        console.error("> navigator.mediaDevices is not available!");
      }
    });
    /*  */
    window.removeEventListener("load", config.load, false);
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);