if (typeof(window.pendota) === "undefined") {
    // checks if the window pendota object already exists.
    // all functions and global vars are stored under this object.
	window.pendota = {};
}

window.pendota.filterClassNames = function (classNames) {
    var classAllowList = [/^js-walkme-.*/, /^js-glue-.*/, /^js-walkme-.*/, /^z-.*/, 'btn', 'btn-primary'];
    return classNames.filter(function(className) {
        return classAllowList.some(function(classAllowListEl) {
            return className.match(classAllowListEl)
        })
    });
};

window.pendota.isIdAllowed = function (id) {
    var idDenyList = [/^ember.*/i];
    return !idDenyList.some(function(idDenyListEl) {
        return id.match(idDenyListEl)
    });
};

window.pendota.filterAttributes = function (attributes) {
    var attributeAllowList = [/^data-testid.*/, /^data-component.*/, 'href'];
    return attributes.filter(function(attributeObj) {
        return attributeAllowList.some(function(attributeAllowListEl) {
            return attributeObj.attribute.match(attributeAllowListEl)
        })
    });
};


window.pendota.isContainsAllowed = function (text) {
    return containsAllowList.some(listEl => listEl === text);
}

var containsAllowList = [
    "Cancel",
    "Save",
    "Back",
    "Finish Later",
    "Continue",
    "Go Back",
    "Learn more",
    "Next",
    "Download",
    "Finish",
    "Learn More",
    "View All",
    "Confirm",
    "Upload",
    "View",
    "contact support.",
    "Back to Support",
    "Bold",
    "Terms",
    "Privacy",
    "Update",
    "Articles list",
    "Overview",
    "Article 1",
    "Article 2",
    "Done",
    "Close",
    "Italic",
    "Go to Dashboard",
    "Learn More.",
    "Learn more here.",
    "Edit",
    "Save Changes",
    "Download Report",
    "Edit article #",
    "Individual Rates",
    "Family Rates",
    "more",
    "Show",
    "download our template",
    "Get Started",
    "Underline",
    "Let's Get Started",
    "Show modal",
    "Contributions",
    "View Progress",
    "Click here",
    "OK",
    "Help Center article",
    "Add your review",
    "Back to Overview",
    "See All",
    "Help",
    "Create Report",
    "Add Object",
    "Create",
    "Unlink",
    "Submit",
    "Cancel Import",
    "HR",
    "PAYROLL",
    "BENEFITS",
    "TIME AND SCHEDULING",
    "Legal",
    "Delete",
    "Create Survey",
    "All",
    "Search",
    "Go back to dashboard",
    "Create Post",
    "Hide",
    "<",
    ">",
    "Upload Spreadsheet",
    "Map Job",
    "Sign Up",
    "How can I set goals for myself?",
    "How do I schedule a One-on-One with a coworker?",
    "All Reviewees",
    "Show Less",
    "All Reviews",
    "Preview what",
    "Export to PDF",
    "Add Time Off Request",
    "Unpprove",
    "Create Policy",
    "Add Timeframe",
    "Create Statement",
    "Clear All",
    "Start",
    "Resume",
    "Open Modal",
    "Action",
]