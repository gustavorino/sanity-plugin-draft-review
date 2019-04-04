# Sanity draft review plugin
## Work In Progress. Use at your own risk.

This plugin allows content editors to quickly **view**, **approve** and **reject** documents in draft mode (not published).



# Getting started

In your sanity project folder, run ``npm install sanity-plugin-draft-review``

Open **sanity.json** file in your project root folder and add the following line to plugins section:

```
"plugins":[
    // other plugins
    "draft-review"
]
```


### TODO

- [ ] Work on the UI/UX ( Loading, Feedback, Better Look )
- [ ] Edge cases / error messages
- [ ] Sometimes sanity create a draft of a document that structualy didn't change
- [ ] Check if it's possible to get drafts and documents in one query 
- [ ] Render a document preview on top of the diff
- [ ] Study if there is a better way to implement the approve/reject feature.
- [ ] Fix the View Button, now it's reloading the page
- [ ] Improve the diff visualization, now it's not rendering the full object structure because it just too much information on the page. It should display the full path of changed properties, example: "title.langs.en" instead of "en"
- [ ] Add [Approve All] / [Reject All] feature with popup confirmation
- [ ] Add a revert option right after Approving / Rejecting