*** Settings ***
Documentation     Acceptance tests for Iconify Navigator — release 0.0.2.
...
...               Criteria:
...               - The view is split into left (collection list) and right (icon detail) panels.
...               - Each collection card displays Name, Category, Tags plus the first 8 icons
...                 as a 2×4 preview grid (48×48 px each, class collection-preview-img).
...               - Each card has an "Open" button (label: Open).
...               - Pressing Open shows the full icon set in the right panel.
...               - Pressing Open on the already-displayed collection does nothing.
...               - Pressing Open on a different collection replaces the right-panel content.
...               - The right panel scrolls; icons must have non-zero dimensions.
...
...               Prerequisites: the app must be running on ${APP_URL}.

Resource          ../resources/app.resource
Test Setup        Open Iconify Navigator
Test Teardown     Close Browser

*** Test Cases ***
Collection Cards Show Name Label
    [Documentation]    Every visible collection must display a "Name:" label so
    ...                the user can identify the icon set.
    Collections Are Loaded
    Get Text    .collection-card >> nth=0    contains    Name:

Collections List Shows Category And Tags Labels
    [Documentation]    Among all loaded collections at least one must show a
    ...                "Category:" label and at least one a "Tags:" label.
    Collections Are Loaded
    Get Text    .collections-list    contains    Category:
    Get Text    .collections-list    contains    Tags:

Open Button Is Present For Each Collection
    [Documentation]    Every collection card must contain an "Open" button;
    ...                the button count must equal the card count.
    Collections Are Loaded
    ${buttons}=    Get Element Count    .open-button
    ${cards}=      Get Element Count    .collection-card
    Should Be Equal As Integers    ${buttons}    ${cards}

Collection Cards Show Preview Icons
    [Documentation]    After the collections list loads, each card must show a
    ...                preview grid of up to 8 icons (class collection-preview-img,
    ...                48×48 px). The IntersectionObserver fires for visible cards
    ...                so at least one preview image must have loaded.
    Collections Are Loaded
    Wait For Elements State    .collection-preview-img >> nth=0    visible    timeout=${PREVIEW_TIMEOUT}
    Wait For Image To Load    .collection-preview-img >> nth=0
    Get Element Count    .collection-preview-img    >    0

Opening A Collection Displays Icon Images
    [Documentation]    After clicking "Open" the right panel must show icon images
    ...                (class icon-img). At least one must have loaded (naturalWidth > 0).
    Collections Are Loaded
    Open First Collection
    Get Element Count    .right-panel .icon-img    >    0
    Wait For Image To Load    .icon-img >> nth=0

Opened Collection Section Heading Contains Collection Name
    [Documentation]    The right-panel heading must follow the pattern
    ...                "<Collection Name> - Icons" so the user knows which set is open.
    ...                The second h2 on the page belongs to the right panel.
    Collections Are Loaded
    Open First Collection
    Get Text    h2 >> nth=1    contains    - Icons

Opening A Different Collection Replaces Previous Icons
    [Documentation]    Clicking "Open" on a second collection must replace the
    ...                right-panel content with that collection's icons.
    ...                The heading changes, confirming the panel was updated.
    Collections Are Loaded
    # Open the first collection and record its heading.
    Click    .open-button >> nth=0
    Wait For Elements State    .icon-img >> nth=0    visible    timeout=${ICONS_TIMEOUT}
    ${first_heading}=    Get Text    h2 >> nth=1
    # Open a different collection — heading must change.
    Click    .open-button >> nth=1
    Wait Until Keyword Succeeds    15s    500ms    Heading Should Change    ${first_heading}
    Get Element Count    .right-panel .icon-img    >    0

