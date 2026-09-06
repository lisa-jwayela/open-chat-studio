'use strict'
import htmx from 'htmx.org'
import TomSelect from "tom-select";

const urlData = document.getElementById('tag-multiselect');
const linkTagUrl = urlData.getAttribute("data-linkTagUrl");
const unlinkTagUrl = urlData.getAttribute("data-unlinkTagUrl");
const tsBlur = new Event("ts-blur");
let controlInstances = [];

function addTag (name, el, objectInfo) {
  return function () {
    let postData = {source: el, swap: 'none', values: {"tag_name": arguments[0], "object_info": objectInfo}};
    htmx.ajax('POST', linkTagUrl, postData);
    let dropdown_option = {text: arguments[0], value: arguments[0]};
    // Add the new tag to all existing TomSelect instances. This will do nothing if it already exists
    controlInstances.forEach((controlInstance) => {
      controlInstance.addOption(dropdown_option);
    });
  };
}

function removeTag (name, el, objectInfo) {
  return function () {
    let postData = {source: el, swap: 'none', values: {"tag_name": arguments[0], "object_info": objectInfo}};
    htmx.ajax('POST', unlinkTagUrl, postData);
  };
}

/**
 * When an htmx swap creates a new tag editor, only that specific editor should
 * receive focus. Focusing indiscriminately would blur whichever other editor the
 * user may already be typing in.
 */
function configureTomSelect(swapTarget) {
  const filter = '.tag-multiselect:not(.tomselected):not(.ts-wrapper)';
  document.querySelectorAll(filter).forEach((el) => {
    let objectInfo = el.getAttribute("data-info");
    let allowCreate = el.getAttribute("data-allowCreate") !== "false";

    let control = new TomSelect(el, {
      plugins: ["remove_button", "caret_position", "input_autogrow"],
      maxItems: null,
      create: allowCreate,
      createFilter: allowCreate ? (input) => {
        if (input.length > 100) {
          el.tomselect.dropdown_content.innerHTML = `<div class="ts-error-message" style="color: red; padding: 5px;">Tag name too long. Maximum 100 characters allowed.</div>`;
          return false;
        }
        return true;
      } : false,
      onItemAdd: addTag('onItemAdd', el, objectInfo),
      onItemRemove: removeTag('onItemRemove', el, objectInfo),
      onBlur: () => {
        el.dispatchEvent(tsBlur);
      }
    });
    controlInstances.push(control);
    if (!swapTarget || swapTarget.contains(el)) {
      control.focus();
    }
  });
}

/**
 * htmx replaces a tag editor's DOM directly (hx-target="#tag-ui-<id>") without ever
 * calling TomSelect's own destroy(). destroy() is what removes the document-level
 * mousedown listener TomSelect registers per instance for click-outside handling;
 * skipping it leaves that listener (and its closure over the now-detached wrapper)
 * attached to document forever, once per editor ever opened in the session.
 */
function destroyControlsWithin(target) {
  controlInstances = controlInstances.filter((control) => {
    if (target.contains(control.wrapper)) {
      control.destroy();
      return false;
    }
    return true;
  });
}

export const setupTagSelects = () => {
  configureTomSelect();
  htmx.on("htmx:beforeSwap", (evt) => { destroyControlsWithin(evt.target) });
  htmx.on("htmx:afterSwap", (evt) => { configureTomSelect(evt.target) });
}
