*** Settings ***
Documentation     Acceptance tests for Iconify Navigator — release 0.0.3.
...               Criteria:
...               - Clicking an icon in the right panel opens a dialog.
...               - The dialog contains icn.color, icn.width, icn.height, icn.flip,
...                 icn.rotate, icn.tagstring, plus copy and close buttons.
...               - Whenever a field changes, icn.tagstring updates with a generated
...                 <img /> tag URL and URL-encoded query parameters.
Resource          ../resources/app.resource
Test Setup        Open Iconify Navigator
Test Teardown     Close Browser

*** Test Cases ***
Clicking An Icon Opens The Dialog With Required Widgets
    [Documentation]    Open one collection, click a right-panel icon, and assert the
    ...                release 0.0.3 dialog controls are present.
    Collections Are Loaded
    Open First Collection
    Click    .right-panel .icon-img >> nth=0
    Wait For Elements State    [id="icn.color"]    visible    timeout=10s
    Wait For Elements State    [id="icn.width"]    visible    timeout=10s
    Wait For Elements State    [id="icn.height"]    visible    timeout=10s
    Wait For Elements State    [id="icn.flip"]    visible    timeout=10s
    Wait For Elements State    [id="icn.rotate"]    visible    timeout=10s
    Wait For Elements State    [id="icn.tagstring"]    visible    timeout=10s
    Get Text    .dialog-actions    contains    copy
    Get Text    .dialog-actions    contains    close

Dialog Fields Update Generated Img Tag
    [Documentation]    Changing dialog fields must regenerate the read-only icn.tagstring.
    Collections Are Loaded
    Open First Collection
    Click    .right-panel .icon-img >> nth=0
    Fill Text    [id="icn.color"]    red blue
    Fill Text    [id="icn.width"]    24
    Select Options By    [id="icn.flip"]    value    horizontal
    ${tag}=    Evaluate JavaScript    [id="icn.tagstring"]    el => el.value
    Should Contain    ${tag}    <img src="
    Should Contain    ${tag}    color=red%20blue
    Should Contain    ${tag}    width=24
    Should Contain    ${tag}    flip=horizontal
