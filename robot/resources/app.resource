*** Settings ***
Documentation    Shared keywords and variables for Iconify Navigator acceptance tests.
...              The application must be running on ${APP_URL} before any test starts
...              (e.g. run "ng serve" in another terminal).
Library          Browser

*** Variables ***
# Base URL of the running Angular application.
${APP_URL}          http://localhost:4200

# Playwright browser engine to use.  Change to "firefox" or "webkit" as needed.
${BROWSER_TYPE}     chromium

# Run headless by default; set to ${FALSE} locally to watch the browser.
${HEADLESS}         ${FALSE}

# How long to wait for the collections list to populate (real API calls).
${COLLECTIONS_TIMEOUT}    15s

# How long to wait for icon images to appear after opening a collection.
${ICONS_TIMEOUT}          25s

# How long to wait for collection preview images to appear on cards.
${PREVIEW_TIMEOUT}        30s

*** Keywords ***
Open Iconify Navigator
    [Documentation]    Opens a fresh browser window and navigates to the app.
    ...                Waits until the main heading is visible before returning.
    New Browser    ${BROWSER_TYPE}    headless=${HEADLESS}
    New Page       ${APP_URL}
    Wait For Elements State    h1    visible    timeout=10s

Collections Are Loaded
    [Documentation]    Blocks until at least one collection card is visible,
    ...                meaning the /collections API call has completed.
    ...                Uses >> nth=0 to target the first card and avoid strict-mode
    ...                violations (the API returns 200+ collections).
    Wait For Elements State    .collection-card >> nth=0    visible    timeout=${COLLECTIONS_TIMEOUT}

Open First Collection
    [Documentation]    Clicks the first "Open" button and waits until at least one
    ...                full-size icon image is rendered in the right panel.
    ...                Uses >> nth=0 to avoid strict-mode violations.
    Click    .open-button >> nth=0
    Wait For Elements State    .icon-img >> nth=0    visible    timeout=${ICONS_TIMEOUT}

Wait For Image To Load
    [Documentation]    Polls an img element until naturalWidth > 0, which confirms
    ...                the browser has fully fetched and decoded the image file.
    ...                naturalWidth stays 0 for broken or not-yet-loaded images.
    [Arguments]    ${selector}    ${timeout}=20s
    Wait Until Keyword Succeeds    ${timeout}    500ms    Image Should Be Loaded    ${selector}

Image Should Be Loaded
    [Documentation]    Single-attempt helper for Wait For Image To Load.
    ...                Fails immediately if the image has not finished loading.
    [Arguments]    ${selector}
    ${nw}=    Evaluate JavaScript    ${selector}    el => el.naturalWidth
    Should Be True    ${nw} > 0    Image not yet loaded or broken: ${selector}

Heading Should Change
    [Documentation]    Asserts that the second h2 on the page no longer contains
    ...                the provided text. Used to verify the right panel updated.
    [Arguments]    ${old_heading}
    ${current}=    Get Text    h2 >> nth=1
    Should Not Be Equal    ${current}    ${old_heading}
