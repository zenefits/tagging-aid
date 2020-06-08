// NOTE: this script depends on insertBaseDefinitions being executed first
if (!pendota._pendotaUIIsInjected) {
	pendota._pendotaUIIsInjected = true;

	// Stores an array of elements traversed by the parent arrows. Resets on every mouseover when in unlocked state
	pendota._pendota_elem_array_ = [];

	// Reused variables
	pendota.sizzlerInputId = "_pendota-sizzler_";
	pendota.sizzlerBtnId = "_pendota-sizzler-icon_";
	pendota.sizzlerCountId = "_pendota-sizzler-count_";
	pendota.autoTagsId = "_pendota-auto-tags_";
	pendota.tagElmClass = "_pendota-tag-elm_";
	pendota.tagItemClass = "_pendota-tag-item_";
	pendota.tagItemTextClass = "_pendota-tag-item-text_";
	pendota.copy_icon_url = chrome.extension.getURL("/src/ui/images/copy_icon.ico");
	pendota.pendo_target_url = chrome.extension.getURL(
		"/src/ui/images/pendo_target.png"
	);
	pendota.plus_sq_url = chrome.extension.getURL("/src/ui/images/plus-square.png");
	pendota.tagBuild = [];

	// Global status variables
	pendota._pendota_isVisible_ = false;
	pendota._pendota_isLocked_ = false;
	pendota.lastSizzleId;
	pendota.sizzleCount;

    /*
    * Listeners for a signal to enter locked/unlocked state
    * @param {message} e
    */
	pendota.lockSignalListener = function (e) {
		if (typeof (e.data) !== "undefined") {
			var data = pendota.tryParseJSON(e.data);
			if (typeof (data.type) !== "undefined" && data.type == "LOCK_SWITCH") {
				pendota.lockSwitch(data.isLocked);
			}
		}
	}


    /*
    * Listens for a signal to change the current locked element.
    * @param {message} e
    */
	pendota.updateSignalListener = function (e) {
		if (typeof (e.data) !== "undefined") {
			var data = pendota.tryParseJSON(e.data);
			if (typeof (data.type) !== "undefined" && data.type == "PENDOTA_UPDATE") {
				pendota.updatePendotaContents(data.element);

				// Reset parent traversal tree
				pendota._pendota_elem_array_ = [];
				pendota._pendota_elem_array_[0] = data.element;
			}
		}
	}

    /*
    * Changes the UI between locked and unlocked states. Locks if isLocked = true, otherwise unlocks.
    * @param {boolean} isLocked
    */
	pendota.lockSwitch = function (isLocked) {
		// locks or unlocks the pendota element scanner
		// var el = e.target;
		pendota.clearAutoTag();
		if (typeof isLocked !== "undefined") {
			if (isLocked) pendota.lockedState();
			else pendota.unlockedState();
		} else {
			if (!pendota._pendota_isLocked_) {
				// if not on pendota interface, locks the scanner
				pendota.lockedState();
			} else {
				pendota.unlockedState();
			}
		}
	}

    /*
    * Forces UI to locked state. Is idempotent.
    */
	pendota.lockedState = function () {
		// Locks the scanner and UI
		document.getElementById("_pendota_status_").textContent =
			"Element Locked.  Click anywhere to reset.";
		//stopMouseover();
		$("#_pendota-lock-icon_").html(
			'<i class="_pendota-feather-locked_" data-feather="lock"></i>'
		);
		$("#_pendota-lock-icon_").addClass("_pendota-icon-locked_");
		$("#_pendota-parent-up_").removeClass("_pendota-hide-arrow_");
		$("#_pendota-parent-down_").removeClass("_pendota-hide-arrow_");
		feather.replace();
		$("#_pendota-feather-up-arrow_").attr(
			"class",
			"_pendota-parent-arrow_ _pendota-active-arrow_"
		);
		$("#_pendota-feather-down-arrow_").attr(
			"class",
			"_pendota-parent-arrow_ _pendota-disabled-arrow_"
		);
		pendota._pendota_isLocked_ = true;
	}

    /*
    * Forces UI to unlocked state. Is idempotent.
    */
	pendota.unlockedState = function () {
		// if already locked, unlocks instead
		// Set the lock icon to starting "unlocked" state
		$("#_pendota-lock-icon_").html(
			'<i class="_pendota-feather-unlocked_" data-feather="unlock"></i>'
		);
		$("#_pendota-lock-icon_").removeClass("_pendota-icon-locked_");
		$("#_pendota-parent-up_").addClass("_pendota-hide-arrow_");
		$("#_pendota-parent-down_").addClass("_pendota-hide-arrow_");
		feather.replace();

		// Set a status text letting the user the targeting is ready
		document.getElementById("_pendota_status_").innerHTML =
			"Click anywhere to Inspect. (Alt + Shift + L)";
		//startMouseover();
		pendota._pendota_isLocked_ = false;
	}

    /*
    * Reusable function that copies the content of an element with ID matching inputId to the clipboard.
    * @param {element} inputId
    */
	pendota.copyToClipboard = function (inputId) {
		// Get the text field
		var copyText = document.getElementById(inputId);

		// Select the text field
		copyText.select();
		copyText.setSelectionRange(0, 99999); // For mobile devices

		// Copy the text field
		document.execCommand("copy");
	}

	/*
	* The listener that copies the identified value to the clipboard
	* @param {event} e
	*/
	pendota.copyListener = function (e) {
		e.stopPropagation();
		e.preventDefault();
		pendota.copyToClipboard(e.currentTarget.dataset.id);
	}

    /*
    * Finds all copy icons currently in the UI and applies the copy function targeted at the corresponding box. 
    */
	pendota.applyCopyFunction = function () {
		$("._pendota-copy-link_").off("click", pendota.copyListener);
		$("._pendota-copy-link_").on("click", pendota.copyListener);
	}

	/*
		* Adds an attribute in the appropriate location in the tag being built.
		* @param {int}		tier
		* @param {string}	attribute
		* @param {string}	value
	*/
	pendota.addToTagBuild = function (tier, attribute, value) {
		if (typeof(value) == "undefined" || value == "") return; //No empty values
		if (['type', 'id'].includes(attribute)) {
			var newVal = {'tier': tier, "items": []};
			newVal[attribute] = {"value": value};
			// single values (type, id)
			if (pendota.tagBuild.length == 0) {
				pendota.tagBuild.push(newVal);
			} else {
				for (var n = 0; n < pendota.tagBuild.length; n++) {
					if(pendota.tagBuild[n].tier == tier) {
						var obj = pendota.tagBuild[n];
						if(typeof(obj[attribute]) == 'undefined' || obj[attribute].value != value) {
							obj[attribute] = {"value": value};
							console.log("Overwrote " + attribute);
							break;
						} else {
							console.log('Duplicate ' + attribute);
							break;
						}
					} else if (pendota.tagBuild[n].tier < tier) {
						pendota.tagBuild = pendota.injectIntoArray(pendota.tagBuild, newVal, n);
						break;
					} else if (n == pendota.tagBuild.length - 1) {
						pendota.tagBuild.push(newVal);
						break;
					}
				}
			}
		} else {
			// compounding values (class, custom attributes)
			var newVal = { "attribute": attribute, "value": value };
			if (pendota.tagBuild.length == 0) {
				pendota.tagBuild.push({ 'tier': tier, "items": [newVal] });
			} else {
				for (var i = 0; i < pendota.tagBuild.length; i++) {
					if (pendota.tagBuild[i].tier == tier) {
						var itemsArr = pendota.tagBuild[i].items;
						var isNew = true;
						for (var j = 0; j < itemsArr.length; j++) {
							if (itemsArr[j].attribute == attribute && itemsArr[j].value == value) {
								// Duplicate class; don't overwrite
								isNew = false;
								console.log('Duplicate ' + attribute);
								break;
							}
						}
						if (isNew) pendota.tagBuild[i].items.push(newVal);
						break;
					} else if (pendota.tagBuild[i].tier < tier) {
						pendota.tagBuild = pendota.injectIntoArray(pendota.tagBuild, { "tier": tier, "items": [newVal] }, i);
						break;
					} else if (i == pendota.tagBuild.length - 1) {
						pendota.tagBuild.push({ 'tier': tier, "items": [newVal] });
						break;
					}
				}
			}
		}
		pendota.updateAutoTag();
	}

	/*
	* Accepts descriptors of an element in the tag build and injects the provided rule
	*/
	pendota.setTagBuildRule = function(objectIndex, isType, isId, itemIndex, rule) {
		if (isType) {
			pendota.tagBuild[objectIndex].type.rule = rule;
		} else if (isId) {
			pendota.tagBuild[objectIndex].id.rule = rule;
		} else {
			pendota.tagBuild[objectIndex].items[itemIndex].rule = rule;
		}
	}

	/*
	* Accepts descriptors of an element in the tag build and returns the requested rule
	*/
	pendota.getTagBuildRule = function(objectIndex, isType, isId, itemIndex) {
		if (isType) {
			return pendota.tagBuild[objectIndex].type.rule;
		} else if (isId) {
			return pendota.tagBuild[objectIndex].id.rule;
		} else {
			return pendota.tagBuild[objectIndex].items[itemIndex].rule;
		}
	}

	/*
	* Checks the current tag build and updates the auto-built tag and free-text tag to reflect it
	*/
	pendota.updateAutoTag = function() {
		console.log('tagBuild: ', pendota.tagBuild);
		var fullTag = document.createElement('div');
		var rawFullTag = "";
		for (var o = 0; o < pendota.tagBuild.length; o++) {
			var tmpSpan = document.createElement('span');
			tmpSpan.classList.add("_pendota-tag-elm_");
			tmpSpan.dataset.buildIndex = o;
			var nextElm = pendota.convertObjToTag(pendota.tagBuild[o]);
			tmpSpan.title = nextElm["tagOut"];
			tmpSpan.innerHTML = nextElm["htmlTagOut"];
			rawFullTag += " " + nextElm["tagOut"];
			fullTag.append(tmpSpan);
		}
		document.getElementById(pendota.autoTagsId).innerHTML = fullTag.innerHTML;
		pendota.changeSizzlerValue(rawFullTag);
		$('.' + pendota.tagItemTextClass).on('click', function(e) {
			text = e.target;
			elm = $(e.target).closest('.' + pendota.tagElmClass)[0];
			item = $(e.target).closest('.' + pendota.tagItemClass)[0];
			var isId = false, isType = false;
 			if ("isId" in item.dataset) isId = true;
			if ("isType" in item.dataset) isType = true;
			console.log(item.dataset);
			console.log('elm: ', elm);
			console.log('item: ', item);
			var objectIndex = elm.dataset.buildIndex;
			var itemIndex = item.dataset.itemIndex;
			console.log('objectIndex: ', objectIndex);
			console.log('itemIndex: ', itemIndex);
			console.log('isType: ', isType);
			console.log('isId: ', isId);
			if (typeof(pendota.getTagBuildRule(objectIndex, isType, isId, itemIndex)) == "undefined") 
			{
				pendota.setTagBuildRule(objectIndex, isType, isId, itemIndex, {type: "contains", value: text.dataset.rawValue.slice(0,3)});
			} else {
				pendota.setTagBuildRule(objectIndex, isType, isId, itemIndex);
			}

			
			pendota.updateAutoTag();
		})
		console.log('fullTag: ', rawFullTag);
	}

	/*
	* Clears the existing auto-built tag and updates the displayed values
	*/
	pendota.clearAutoTag = function() {
		pendota.tagBuild = [];
		document.getElementById(pendota.autoTagsId).innerHTML = "";
		pendota.changeSizzlerValue(" ");
	}

	/*
	* Accepts a tagBuild object as input and returns it in valid CSS selector syntax
	* @param 	{object}	buildObj
	* @returns	{string}	the build object in CSS syntax
	* @returns	{string}	the build object with HTML wrappers in CSS syntax
	*/
	pendota.convertObjToTag = function(buildObj) {
		var tagOut = ''
		var htmlTagOut = document.createElement('div');
		if (buildObj.hasOwnProperty("type")) {
			typeString = pendota.createCSSRule("type", buildObj.type.value, buildObj.type.rule);
			tagOut += typeString;
			let tmpSpan = document.createElement('span');
			tmpSpan.classList.add(pendota.tagItemClass);
			tmpSpan.dataset.isType = "";
			let tmpTextSpan = document.createElement('span');
			tmpTextSpan.classList.add("_pendota-tag-item-text_");
			tmpTextSpan.innerText = typeString;
			tmpTextSpan.title = typeString;
			tmpTextSpan.dataset.rawValue = buildObj.type.value;
			tmpSpan.append(tmpTextSpan);
			htmlTagOut.append(tmpSpan);
		}
		if (buildObj.hasOwnProperty("id")) {
			let idString = pendota.createCSSRule("id", buildObj.id.value, buildObj.id.rule);
			tagOut += idString;
			let tmpSpan = document.createElement('span');
			tmpSpan.classList.add(pendota.tagItemClass);
			tmpSpan.dataset.isId = "";
			let tmpTextSpan = document.createElement('span');
			tmpTextSpan.classList.add("_pendota-tag-item-text_");
			tmpTextSpan.innerText = idString;
			tmpTextSpan.title = idString;
			tmpTextSpan.dataset.rawValue = buildObj.id.value;
			tmpSpan.append(tmpTextSpan);
			htmlTagOut.append(tmpSpan);
		}
		if (buildObj.hasOwnProperty("items")) {
			itemArr = buildObj.items;
			for (var i = 0; i < itemArr.length; i++) {
				var tmpSpan = document.createElement('span');
				tmpSpan.classList.add(pendota.tagItemClass);
				tmpSpan.dataset.itemIndex = i;
				let item = itemArr[i];
				let addStr = pendota.createCSSRule(item.attribute, item.value, item.rule);
				tagOut += addStr;
				let tmpTextSpan = document.createElement('span');
				tmpTextSpan.classList.add("_pendota-tag-item-text_");
				tmpTextSpan.innerText = addStr;
				tmpTextSpan.title = addStr;
				tmpTextSpan.dataset.rawValue = item.value;
				tmpSpan.append(tmpTextSpan);
				htmlTagOut.append(tmpSpan);
			}
		}
		return {"tagOut": tagOut, "htmlTagOut": htmlTagOut.innerHTML};
	}

	/*
	* Generates a valid CSS attribute rule from a tagBuild item
	* @param {object} item 
	*/
	pendota.createCSSRule = function (attribute, itemValue, rule) {
		var outStr = '';
		if (attribute == "type") {
			// item is an element type
			outStr = itemValue;
		} else if (typeof(rule) == "undefined" && attribute == "class") {
			// item is a class with no modifying rules
			outStr = "." + itemValue;
		} else if (typeof(rule) == "undefined" && attribute == "id") { 
			// item is an id with no modifying rules
			outStr = "#" + itemValue;
		} else if(typeof(rule) != "undefined" && attribute == "class") {
			// begin and ends with rules on classes are tricky; better not to allow them
			switch(rule.type) {
				case "contains":
					outStr = "[" + attribute + "*=\"" + rule.value + "\"]";
					break;
				default:
					// rule type not recognized, default to equals
					outStr = "[" + attribute + "=\"" + itemValue + "\"]";
			} 
		} else if(typeof(rule) != "undefined") {
			// item has a modifying rule and is not a class, type, or id
			switch(rule.type) {
				case "beginsWith":
					outStr = "[" + attribute + "^=\"" + rule.value + "\"]";
					break;
				case "endsWith":
					outStr = "[" + attribute + "$=\"" + rule.value + "\"]";
					break;
				case "contains":
					outStr = "[" + attribute + "*=\"" + rule.value + "\"]";
					break;
				default:
					// rule type not recognized, default to equals
					outStr = "[" + attribute + "=\"" + itemValue + "\"]";
			} 
		} else {
			// item is not a type/class/id and has no modifying rules
			outStr = "[" + attribute + "=\"" + itemValue + "\"]";
		}
		return outStr;
	}

	/*
	* Returns a new array with value injected at the provided index, and all subsequent values pushed back one index
	* @param {array} inArray
	* @param {any}	 value
	* @param {index} int
	*/
	pendota.injectIntoArray = function (inArray, value, index) {
		return inArray.slice(0, index).concat(value).concat(inArray.slice(index));
	}

	/*
	* The listener function that adds a value to the tag build
	* @param {event} e
	*/
	pendota.addToBuildListener = function (e) {
		e.stopPropagation();
		e.preventDefault();
		inp = document.getElementById(e.currentTarget.dataset.id);
		pendota.addToTagBuild(pendota._pendota_elem_array_.length - 1, inp.dataset.attr, inp.dataset.rawvalue);
	};

	/*
    * Finds all plus_square icons currently in the UI and applies the addtobuild function targeted at the corresponding box. 
    */
   	pendota.applyAddFunction = function () {
		$("._pendota-addtobuild-btn_").off("click", pendota.addToBuildListener);
		$("._pendota-addtobuild-btn_").on("click", pendota.addToBuildListener);
	}

    /*
    * Updates the element, ID, and classes in the tagging aid UI.
    * @param {element} e
    */
	pendota.updatePendotaContents = function (e) {
		// Get the target element's Id and Classes
		var _id_ = e.id;
		var _classNames_ = e.classes;

		var _elemType_ = e.nodeName.toLowerCase(); // stylistic choice

		var appendedHTML = ""; // clear extra class results

		// Set the result boxes that are always visible
		$("#_pendota_type-result_").attr("value", "" + _elemType_);
		$("#_pendota_type-result_").attr("data-rawvalue", _elemType_);
		$('#_pendota_type-result_').attr("title", "" + _elemType_);
		$("#_pendota_id-result_").attr("value", "#" + _id_);
		$("#_pendota_id-result_").attr("data-rawvalue", _id_);
		$('#_pendota_id-result_').attr("title", "#" + _id_);
		$("#_pendota_class-result-0_").attr("value", "." + _classNames_[0]);
		$("#_pendota_class-result-0_").attr("data-rawvalue", _classNames_[0]);
		$('#_pendota_class-result-0_').attr("title", "" + _classNames_[0]);
		$("#_pendota_template-table_").empty();

		// Build extra class spaces
		for (i = 1; i < _classNames_.length; i++) {
			appendedHTML =
				appendedHTML +
				"<tr>" +
				'<td width="82%" class="_pendota_input-row_"><input no-drag class="_pendota_form-control_ _pendota_class-result_" type="text" id="_pendota_class-result-' +
				i +
				'_"  data-attr="class" data-rawvalue="' + _classNames_[i] + '" value=".' +
				_classNames_[i] + '" title=".' + _classNames_[i] +
				'" readonly></td>' +
				'<td width="2%" class="_pendota_input-row_">&nbsp;</td>' +
				'<td width="8%" class="_pendota_input-row_">' +
				'<div data-id="_pendota_class-result-' + i + '_" class="_pendota-addtobuild-btn_"  title="Add to tag">' +
				'<a href="#"><img class="_pendota-addtobuild-icon_" src=' + pendota.plus_sq_url + ' ></a>' +
				'</div>' +
				'</td>' +
				'<td width="8%" class="_pendota_input-row_">' +
				'<div data-id="_pendota_class-result-' +
				i +
				'_" class="_pendota-copy-link_" title="Copy value">' +
				'<a href="#"><img class=_pendota-copy-icon_ src=' +
				pendota.copy_icon_url +
				'> </a>' +
				"</div>" +
				"</td>" +
				"</tr>";
		}

		// Append extra class spaces
		if (_classNames_.length > 1) {
			$("#_pendota_template-table_").html(appendedHTML);
		}

		// Define the copy function for all copy icons
		pendota.applyCopyFunction();
		pendota.applyAddFunction();
	}

    /*
    * Sends a signal to activate the Sizzler on all frames and directly activates in the UI.
    */
	pendota._pendotaActivateSizzler = function () {
		pendota.sendMessageToAllFrames(window, { type: "SIZZLE_SWITCH", isActive: true });
		pendota.signalSizzlerUpdate();
		$("#" + pendota.sizzlerBtnId).addClass("_pendota-clicked");
		$("#" + pendota.sizzlerBtnId).html("Stop");
		document.getElementById(pendota.sizzlerInputId).addEventListener("input", pendota.signalSizzlerUpdate);
		document.getElementById(pendota.sizzlerBtnId).removeEventListener("click", pendota._pendotaActivateSizzler);
		document.getElementById(pendota.sizzlerBtnId).addEventListener("click", pendota._pendotaDeactivateSizzler);
		window.addEventListener("message", pendota.sizzlerCountSignalListener, true);
	}

    /*
    * Sends a signal to deactivate the Sizzler on all frames and removes it from the UI.
    */
	pendota._pendotaDeactivateSizzler = function () {
		pendota.sendMessageToAllFrames(window, { type: "SIZZLE_SWITCH", isActive: false });
		$("#" + pendota.sizzlerBtnId).removeClass("_pendota-clicked");
		$("#" + pendota.sizzlerBtnId).html("Test");
		$("#" + pendota.sizzlerCountId).html("--");
		document.getElementById(pendota.sizzlerInputId).removeEventListener("input", pendota.signalSizzlerUpdate);
		document.getElementById(pendota.sizzlerBtnId).removeEventListener("click", pendota._pendotaDeactivateSizzler);
		document.getElementById(pendota.sizzlerBtnId).addEventListener("click", pendota._pendotaActivateSizzler);
		window.removeEventListener("message", pendota.sizzlerCountSignalListener, true);
	}

	/*
	* Changes the sizzler input value and triggers an input change
	* @param {string} newValue
	*/
	pendota.changeSizzlerValue = function(newValue) {
		var inpEvent = new Event('input', {
			bubbles: true,
			cancelable: true,
		});
		var chgEvent = new Event('change', {
			bubbles: true,
			cancelable: true,
		});
		var sizzlerInput = document.getElementById(pendota.sizzlerInputId);
		sizzlerInput.value = newValue;
		sizzlerInput.dispatchEvent(inpEvent);
		sizzlerInput.dispatchEvent(chgEvent);
	}

    /*
    * Sends a message to all frames to change the current sizzler selector to the value in the UI.
    */
	pendota.signalSizzlerUpdate = function () {
		pendota.sizzleCount = 0;
		pendota.lastSizzleId = pendota.fiveDigitId();
		pendota.sendMessageToAllFrames(window, { type: "SIZZLE_UPDATE", selector: document.getElementById(pendota.sizzlerInputId).value, updateId: pendota.lastSizzleId });
	}

    /*
    * As count updates come in, builds a count of Sizzler matches in every frame.
    * @param {int} value
    */
	pendota.addToSizzleCount = function (value) {
		pendota.sizzleCount += value;
		document.getElementById(pendota.sizzlerCountId).innerHTML = "(" + pendota.sizzleCount + ")";
	}

    /*
    * Listens for incoming count report signals. Does not add them if they do not match the most recent Sizzler updateId.
    * @param {message} e
    */
	pendota.sizzlerCountSignalListener = function (e) {
		if (typeof (e.data) !== "undefined") {
			var data = pendota.tryParseJSON(e.data);
			if (typeof (data.type) !== "undefined" && data.type == "SIZZLE_COUNT" && data.updateId == pendota.lastSizzleId) {
				pendota.addToSizzleCount(parseInt(data.count));
			}
		}
	}

    /*
    * Randomizes a 5-digit ID for the sizzler update process.
    * @returns {int}	a random int, always 5 digits
    */
	pendota.fiveDigitId = function () {
		return Math.floor(Math.random() * 90000) + 10000;
	}

    /*
    * Displays the tagging aid UI and turns on relevant listeners.
    */
	pendota._pendotaInsertUI_ = function () {
		//Injects the tag assistant UI
		pendota._pendota_isVisible_ = true;
		pendota._pendota_isLocked_ = false;

		// add listener for lock signal
		window.addEventListener("message", pendota.lockSignalListener, true);

		// add listener for update signal
		window.addEventListener("message", pendota.updateSignalListener, true);

		// Append popup div to the body
		$.get(chrome.extension.getURL("src/ui/pendota.html"))
			.then((data) => {
				$("body").append(data);
			})
			.then(() => {
				// Execute functions after appending UI

				feather.replace(); // sets feather icons (e.g. lock icon)

				var position = { x: 0, y: 0 };
				// Implements the interact.js library to make the assistant draggable
				interact("._pendota-draggable_").draggable({
					ignoreFrom: "[no-drag]",
					listeners: {
						move(event) {
							position.x += event.dx;
							position.y += event.dy;

							event.target.style.transform = `translate(${position.x}px, ${position.y}px)`;
						},
					},
				});

				// Points the image source for static images stored with extension
				$("._pendota-copy-icon_").attr("src", pendota.copy_icon_url);
				$("._pendota-addtobuild-icon_").attr("src", pendota.plus_sq_url);
				$("#_pendota-target-img_").attr("src", pendota.pendo_target_url);

				// Sets the onclick function for the parent tree traversal upwards
				document
					.getElementById("_pendota-parent-up_")
					.addEventListener("click", function (ev) {
						currentElem =
							pendota._pendota_elem_array_[pendota._pendota_elem_array_.length - 1];
						if (currentElem.nodeName.toLowerCase() != "html") {
							pendota.sendMessageToAllFrames(window, {
								type: "PENDOTA_TRAVERSE_UP",
							});
							parentElem = {};
							parentElem = currentElem.parentNode; // html object elements act weird if passed directly to an array. Storing this way keeps them in object form
							pendota._pendota_elem_array_.push(parentElem);
							pendota.updatePendotaContents(parentElem);
							//updateOutline(parentElem["obj"]);
							$("#_pendota-feather-down-arrow_").attr(
								"class",
								"_pendota-parent-arrow_ _pendota-active-arrow_"
							);
							if (parentElem.nodeName.toLowerCase() == "html") {
								$("#_pendota-feather-up-arrow_").attr(
									"class",
									"_pendota-parent-arrow_ _pendota-disabled-arrow_"
								);
							}
						}
					});

				// Sets the onclick funtion for the parent tree traversal downwards
				document
					.getElementById("_pendota-parent-down_")
					.addEventListener("click", function (ev) {
						currentElem =
							pendota._pendota_elem_array_[pendota._pendota_elem_array_.length - 1];
						if (pendota._pendota_elem_array_.length > 1) {
							pendota.sendMessageToAllFrames(window, {
								type: "PENDOTA_TRAVERSE_DOWN",
							});
							pendota._pendota_elem_array_.pop();
							childElem =
								pendota._pendota_elem_array_[
								pendota._pendota_elem_array_.length - 1
								];
							pendota.updatePendotaContents(childElem);
							//updateOutline(childElem["obj"]);
							$("#_pendota-feather-up-arrow_").attr(
								"class",
								"_pendota-parent-arrow_ _pendota-active-arrow_"
							);
							if (pendota._pendota_elem_array_.length == 1) {
								$("#_pendota-feather-down-arrow_").attr(
									"class",
									"_pendota-parent-arrow_ _pendota-disabled-arrow_"
								);
							}
						}
					});

				// prep the sizzler in an off state
				var sizzleIsActive = false;
				document.getElementById(pendota.sizzlerBtnId).addEventListener("click", pendota._pendotaActivateSizzler);

				// set the scanner in motion the first time the UI is displayed
				pendota.unlockedState();

				// Apply the copy function to all copy icons
				pendota.applyCopyFunction();
				pendota.applyAddFunction();

				// Call highlight toggler when clicking enter
				$("#_pendota-sizzler-form_").on("submit", function (e) {
					e.preventDefault();
					document.getElementById(pendota.sizzlerBtnId).click();
				});
			});
	}


    /*
    * Removes the tagging aid UI and listeners.
    */
	pendota._pendotaRemoveUI_ = function () {
		pendota._pendota_isVisible_ = false;

		$("#_pendota-wrapper_").remove(); // Remove all html

		// Remove listeners
		window.removeEventListener("message", pendota.lockSignalListener, true);
		window.removeEventListener("message", pendota.updateSignalListener, true);
	}
}