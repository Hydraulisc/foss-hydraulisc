/*  Settings Navigation Settings
    
    Below is a short sweet and simple list of DOM Manipulations
    that control settings displays and such.

    Nothing fancy, just close everything and open the tab you want to see.
*/
function hideAllSettings() {
    document.querySelectorAll(".tobesetnone").forEach(function(element) {
        element.style.display = 'none';
    });
}
function profileSettings() {
    hideAllSettings();
    document.getElementById("profiletabulatordisplay").style.display = 'block';
}
function privacySettings() {
    hideAllSettings();
    document.getElementById("privacytabulatordisplay").style.display = 'block';
}
function notifSettings() {
    hideAllSettings();
    document.getElementById("notificationstabulatordisplay").style.display = 'block';
}
function mailNotifications() {
    hideAllSettings();
    document.getElementById("emailtabulatordisplay").style.display = 'block';
}
function securitySettings() {
    hideAllSettings();
    document.getElementById("securitytabulatordisplay").style.display = 'block';
}
function generalClient() {
    hideAllSettings();
    document.getElementById("generaltabulatordisplay").style.display = 'block';
}
function themeFunction() {
    hideAllSettings();
    document.getElementById("themestabulatordisplay").style.display = 'block';
}
function pluginsList() {
    hideAllSettings();
    document.getElementById("pluginstabulatordisplay").style.display = 'block';
}
function mute_or_unmute() {
    hideAllSettings();
    document.getElementById("blocktabulatordisplay").style.display = 'block';
}
function apiSetting() {
    hideAllSettings();
    document.getElementById("apitabulatordisplay").style.display = 'block';
}
function payloadUrl() {
    hideAllSettings();
    document.getElementById("webhooktabulatordisplay").style.display = 'block';
}
function additionalSettings() {
    hideAllSettings();
    document.getElementById("othersettingsdisplay").style.display = 'block';
}
function adminPanel() {
    hideAllSettings();
    document.getElementById("admincontrolpanel").style.display = 'block';
}