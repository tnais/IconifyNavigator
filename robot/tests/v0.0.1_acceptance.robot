*** Settings ***
Documentation     Acceptance tests for Iconify Navigator — release 0.0.1.
...
...               Criteria:
...               - The application must not crash.
...               - The application must not preload icon data on startup.
...               - The application must display the list of available icon sets
...                 fetched from the Iconify server using the /collections endpoint.
...
...               Prerequisites: the app must be running on http://localhost:4200.

Resource          ../resources/app.resource
Test Setup        Open Iconify Navigator
Test Teardown     Close Browser

*** Test Cases ***
Application Loads Without Crashing
    [Documentation]    The main heading must be rendered and no error banner
    ...                must be visible after the page finishes loading.
    Get Text              h1    ==    Iconify Navigator
    Get Element Count     .error    ==    0

Available Icon Sets Are Listed On Startup
    [Documentation]    The collections list must contain at least one entry once
    ...                the /collections response has been received.
    Collections Are Loaded
    Get Element Count    .collection-card    >    0

Icons Are Not Preloaded On Startup
    [Documentation]    No full-size icon images must appear in the right panel before
    ...                the user explicitly opens a collection.
    ...                Collection cards may show preview thumbnails (.collection-preview-img)
    ...                but the right-panel icon grid (.icon-img) must remain empty.
    Collections Are Loaded
    Get Element Count    .right-panel .icon-img    ==    0
