/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2010 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.LGPL-3)
 *
 * See README.md for usage and integration instructions.
 */
"use strict";
/*global $, RFB, Canvas, VNC_uri_prefix, Element, Fx */

var DefaultControls = {

settingsOpen : false,

// Render default controls and initialize settings menu
load: function(target) {
    var url, html, encrypt, cursor, base64, i, sheet, sheets,
        DC = DefaultControls;

    /* Handle state updates */
    RFB.setUpdateState(DC.updateState);
    RFB.setClipboardReceive(DC.clipReceive);

    /* Populate the 'target' DOM element with default controls */
    if (!target) { target = 'vnc'; }

    html = "";
    html += '<div id="VNC_controls">';
    html += '  <ul>';
    html += '    <li>Host: <input id="VNC_host"></li>';
    html += '    <li>Port: <input id="VNC_port"></li>';
    html += '    <li>Password: <input id="VNC_password"';
    html += '        type="password"></li>';
    html += '    <li><input id="VNC_connect_button" type="button"';
    html += '        value="Loading" disabled></li>';
    html += '  </ul>';
    html += '</div>';
    html += '<div id="VNC_screen">';
    html += '  <div id="VNC_status_bar" class="VNC_status_bar" style="margin-top: 0px;">';
    html += '    <table border=0 width=100%><tr>';
    html += '      <td><div id="VNC_status">Loading</div></td>';
    html += '      <td width=1%><div class="VNC_buttons_right">';
    html += '        <input type=button class="VNC_status_button" value="Settings"';
    html += '          id="menuButton"';
    html += '          onclick="DefaultControls.clickSettingsMenu();">';
    html += '        <span id="VNC_settings_menu"';
    html += '          onmouseover="DefaultControls.canvasBlur();"';
    html += '          onmouseout="DefaultControls.canvasFocus();">';
    html += '          <ul>';
    html += '            <li><input id="VNC_encrypt"';
    html += '                type="checkbox" checked> Encrypt</li>';
    html += '            <li><input id="VNC_base64"';
    html += '                type="checkbox" checked> Base64 Encode</li>';
    html += '            <li><input id="VNC_true_color"';
    html += '                type="checkbox" checked> True Color</li>';
    html += '            <li><input id="VNC_cursor"';
    html += '                type="checkbox" checked> Local Cursor</li>';
    html += '            <hr>';

    // Stylesheet selection dropdown
    html += '            <li><select id="VNC_stylesheet" name="vncStyle">';
    html += '              <option value="default">default</option>';
    sheet = Util.selectStylesheet();
    sheets = Util.getStylesheets();
    for (i = 0; i < sheets.length; i++) {
        html += '<option value="' + sheets[i].title + '">' + sheets[i].title + '</option>';
    }
    html += '              </select> Style</li>';

    // Logging selection dropdown
    html += '            <li><select id="VNC_logging" name="vncLogging">';
    llevels = ['error', 'warn', 'info', 'debug'];
    for (i = 0; i < llevels.length; i++) {
        html += '<option value="' + llevels[i] + '">' + llevels[i] + '</option>';
    }
    html += '              </select> Logging</li>';

    html += '            <hr>';
    html += '            <li><input type="button" id="VNC_apply" value="Apply"';
    html += '                onclick="DefaultControls.settingsApply()"></li>';
    html += '          </ul>';
    html += '        </span></div></td>';
    html += '      <td width=1%><div class="VNC_buttons_right">';
    html += '        <input type=button class="VNC_status_button" value="Send CtrlAltDel"';
    html += '          id="sendCtrlAltDelButton"';
    html += '          onclick="DefaultControls.sendCtrlAltDel();"></div></td>';
    html += '    </tr></table>';
    html += '  </div>';
    html += '  <canvas id="VNC_canvas" width="640px" height="20px">';
    html += '      Canvas not supported.';
    html += '  </canvas>';
    html += '</div>';
    html += '<br><br>';
    html += '<div id="VNC_clipboard">';
    html += '  VNC Clipboard:';
    html += '  <input id="VNC_clipboard_clear_button"';
    html += '      type="button" value="Clear"';
    html += '      onclick="DefaultControls.clipClear();">';
    html += '  <br>';
    html += '  <textarea id="VNC_clipboard_text" cols=80 rows=5';
    html += '    onfocus="DefaultControls.canvasBlur();"';
    html += '    onblur="DefaultControls.canvasFocus();"';
    html += '    onchange="DefaultControls.clipSend();"></textarea>';
    html += '  <br>';
    html += '   <input id="VNC_scale" type="text"';
    html += '    onfocus="DefaultControls.clipFocus();"';
    html += '    onblur="DefaultControls.clipBlur();"';
    html += '        value="1">'
    html += '   <input id="VNC_scale_button" type="button"';
    html += '        value="Set scale">';
    html += '</div>';
    $(target).innerHTML = html;

    // Settings with immediate effects
    DC.initSetting('logging', 'default');
    Util.init_logging(DC.getSetting('logging'));
    DC.initSetting('stylesheet', 'default');
    Util.selectStylesheet(DC.getSetting('stylesheet'));

    /* Populate the controls if defaults are provided in the URL */
    DC.initSetting('host', '');
    DC.initSetting('port', '');
    DC.initSetting('password', '');
    DC.initSetting('encrypt', true);
    DC.initSetting('base64', true);
    DC.initSetting('true_color', true);
    DC.initSetting('cursor', true);

    $('VNC_screen').onmousemove = function () {
            // Unfocus clipboard when over the VNC area
            if (! Canvas.focused) {
                $('VNC_clipboard_text').blur();
            }
        };
},

// Read a query string variable
getQueryVar: function(name) {
    var re = new RegExp('[\?].*' + name + '=([^\&\#]*)');
    return (document.location.href.match(re) || ['',null])[1];
},

// Read form control compatible setting from cookie
getSetting: function(name) {
    var val, ctrl = $('VNC_' + name);
    val = Util.readCookie(name);
    if (ctrl.type === 'checkbox') {
        if (val.toLowerCase() in {'0':1, 'no':1, 'false':1}) {
            val = false;
        } else {
            val = true;
        }
    }
    return val;
},

// Update cookie and form control setting. If value is not set, then
// updates from control to current cookie setting.
updateSetting: function(name, value) {
    var i, ctrl = $('VNC_' + name);
    // Save the cookie for this session
    if (typeof value !== 'undefined') {
        Util.createCookie(name, value);
    }

    // Update the settings control
    value = DefaultControls.getSetting(name);
    if (ctrl.type === 'checkbox') {
        ctrl.checked = value;
    } else if (typeof ctrl.options !== 'undefined') {
        for (i = 0; i < ctrl.options.length; i++) {
            if (ctrl.options[i].value === value) {
                ctrl.selectedIndex = i;
                break;
            }
        }
    } else {
        ctrl.value = value;
    }
},

// Save control setting to cookie
saveSetting: function(name) {
    var val, ctrl = $('VNC_' + name);
    if (ctrl.type === 'checkbox') {
        val = ctrl.checked;
    } else if (typeof ctrl.options !== 'undefined') {
        val = ctrl.options[ctrl.selectedIndex].value;
    } else {
        val = ctrl.value;
    }
    Util.createCookie(name, val);
    Util.Debug("Setting saved '" + name + "=" + val + "'");
    return val;
},

// Initial page load read/initialization of settings
initSetting: function(name, defVal) {
    var val, ctrl = $('VNC_' + name), DC = DefaultControls;

    // Check Query string followed by cookie
    val = DC.getQueryVar(name);
    if (val === null) {
        val = Util.readCookie(name, defVal);
    }
    DC.updateSetting(name, val);
    Util.Debug("Setting '" + name + "' initialized to '" + val + "'");
    return val;
},


// Toggle the settings menu:
//   On open, settings are refreshed from saved cookies.
//   On close, settings are applied
clickSettingsMenu: function() {
    var DC = DefaultControls;
    if (DefaultControls.settingsOpen) {
        DC.settingsApply();

        DC.closeSettingsMenu();
    } else {
        DC.updateSetting('encrypt');
        DC.updateSetting('base64');
        DC.updateSetting('true_color');
        if (Canvas.isCursor()) {
            DC.updateSetting('cursor');
        } else {
            DC.updateSettings('cursor', false);
            $('VNC_cursor').disabled = true;
        }
        DC.updateSetting('stylesheet');
        DC.updateSetting('logging');

        DC.openSettingsMenu();
    }
},

// Open menu
openSettingsMenu: function() {
    $('VNC_settings_menu').style.display = "block";
    DefaultControls.settingsOpen = true;
},

// Close menu (without applying settings)
closeSettingsMenu: function() {
    $('VNC_settings_menu').style.display = "none";
    DefaultControls.settingsOpen = false;
},

// Disable/enable controls depending on connection state
settingsDisabled: function(disabled) {
    $('VNC_encrypt').disabled = disabled;
    $('VNC_base64').disabled = disabled;
    $('VNC_true_color').disabled = disabled;
    if (Canvas.isCursor()) {
        $('VNC_cursor').disabled = disabled;
    } else {
        DefaultControls.updateSettings('cursor', false);
        $('VNC_cursor').disabled = true;
    }
},

// Save/apply settings when 'Apply' button is pressed
settingsApply: function() {
    Util.Debug(">> settingsApply");
    var curSS, newSS, DC = DefaultControls;
    DC.saveSetting('encrypt');
    DC.saveSetting('base64');
    DC.saveSetting('true_color');
    if (Canvas.isCursor()) {
        DC.saveSetting('cursor');
    }
    DC.saveSetting('stylesheet');
    DC.saveSetting('logging');

    // Settings with immediate (non-connected related) effect
    Util.selectStylesheet(DC.getSetting('stylesheet'));
    Util.init_logging(DC.getSetting('logging'));

    Util.Debug("<< settingsApply");
},



setPassword: function() {
    console.log("setPassword");
    RFB.sendPassword($('VNC_password').value);
    return false;
},

sendCtrlAltDel: function() {
    RFB.sendCtrlAltDel();
},

updateState: function(state, msg) {
    var s, c, z, klass;
    s = $('VNC_status');
    sb = $('VNC_status_bar');
    c = $('VNC_connect_button');
    z = $('VNC_scale');
    zb = $('VNC_scale_button');
    
    cad = $('sendCtrlAltDelButton');
    switch (state) {
        case 'failed':
        case 'fatal':
            c.disabled = true;
            cad.disabled = true;
            DefaultControls.settingsDisabled(true);
            klass = "VNC_status_error";
            break;
        case 'normal':
            c.value = "Disconnect";
            c.onclick = DefaultControls.disconnect;
            zb.onclick = DefaultControls.setScale;
            c.disabled = false;
            cad.disabled = false;
            DefaultControls.settingsDisabled(true);
            klass = "VNC_status_normal";
            
            break;
        case 'disconnected':
        case 'loaded':
            c.value = "Connect";
            c.onclick = DefaultControls.connect;

            c.disabled = false;
            cad.disabled = true;
            DefaultControls.settingsDisabled(false);
            klass = "VNC_status_normal";
            break;
        case 'password':
            c.value = "Send Password";
            c.onclick = DefaultControls.setPassword;

            c.disabled = false;
            cad.disabled = true;
            DefaultControls.settingsDisabled(true);
            klass = "VNC_status_warn";
            break;
        default:
            c.disabled = true;
            cad.disabled = true;
            DefaultControls.settingsDisabled(true);
            klass = "VNC_status_warn";
            break;
    }

    if (typeof(msg) !== 'undefined') {
        s.setAttribute("class", klass);
        sb.setAttribute("class", klass);
        s.innerHTML = msg;
    }

},

connect: function() {
    var host, port, password, DC = DefaultControls;

    DC.closeSettingsMenu();

    host = $('VNC_host').value;
    port = $('VNC_port').value;
    password = $('VNC_password').value;
    if ((!host) || (!port)) {
        throw("Must set host and port");
    }

    RFB.setEncrypt(DC.getSetting('encrypt'));
    RFB.setBase64(DC.getSetting('base64'));
    RFB.setTrueColor(DC.getSetting('true_color'));
    RFB.setCursor(DC.getSetting('cursor'));

    RFB.connect(host, port, password);
},

disconnect: function() {
    DefaultControls.closeSettingsMenu();

    RFB.disconnect();
},

canvasBlur: function() {
    Canvas.focused = false;
},

canvasFocus: function() {
    Canvas.focused = true;
},

clipClear: function() {
    $('VNC_clipboard_text').value = "";
    RFB.clipboardPasteFrom("");
},

clipReceive: function(text) {
    Util.Debug(">> DefaultControls.clipReceive: " + text.substr(0,40) + "...");
    $('VNC_clipboard_text').value = text;
    Util.Debug("<< DefaultControls.clipReceive");
},

clipSend: function() {
    var text = $('VNC_clipboard_text').value;
    Util.Debug(">> DefaultControls.clipSend: " + text.substr(0,40) + "...");
    RFB.clipboardPasteFrom(text);
    Util.Debug("<< DefaultControls.clipSend");
},


setScale: function() {
    var scaleFactor = parseFloat($('VNC_scale').value);
    Canvas.rescale(scaleFactor);
}

};
