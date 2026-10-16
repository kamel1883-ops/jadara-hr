// Reserve the tab during the click, before an asynchronous signed-link request.
export function reserveDocumentWindow() {
  const tab = window.open('about:blank', '_blank');
  if (tab) tab.opener = null;
  return tab;
}

export function finishDocumentWindow(tab, url) {
  if (!url) {
    if (tab && !tab.closed) tab.close();
    return false;
  }
  if (tab && !tab.closed) tab.location.replace(url);
  else window.location.assign(url);
  return true;
}