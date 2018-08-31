import { loopDidMount } from './component';
import { isString, isNumber, isBoolean, isFunction } from '../utils';
import { buildComponent } from './index';
import { ATTR_KEY } from '../data'
import { handleNode, removeNode } from '../vdom/handleComponent';

export let diffLeval = 0;


export function diff(vnode, dom, parentNode, mountAll, componetRef, context) {//componetRef: 当在第一次渲染时被传入true。用于调用componentDidMount。
  ++diffLeval;
  const ret = idiff(vnode, dom, mountAll, componetRef, context);
  if (parentNode && parentNode !== ret.parentNode) {
    parentNode.appendChild(ret);
  }
  if (!--diffLeval) {
    if (componetRef) {
      loopDidMount();
    }
  }
  return ret;
}

function idiff(vnode, dom, mountAll, componetRef, context) {
  let out = dom;

  if (isBoolean(vnode) || vnode === null || vnode === undefined) {
    vnode = '';
  }

  if (isString(vnode) || isNumber(vnode)) {
    if (dom && dom.splitText !== undefined && (!dom._component || !componetRef)) {
      dom.nodeValue = vnode;
    } else {
      out = document.createTextNode(vnode);
      if (dom && dom.parentNode) {
        dom.parentNode.replaceChild(out, dom);
        handleNode(dom);
      }
    }
    out[ATTR_KEY] = true;
    return out;
  }

  const vnodeName = vnode.name;

  if (isFunction(vnodeName)) {
    return buildComponent(vnode, dom, mountAll, context);
  }

  if (!dom || !isSameNode(dom, vnodeName)) {
    out = createNode(dom);
    if (dom) {
      let fstC;
      const parentNode = dom.parentNode;
      while (fstC = dom.firstChild) {
        out.appendChild(fstC);
      }
      if (parentNode) {
        parentNode.replaceChild(out, dom);
      }
    }
    handleNode(dom);
  }

  let fc = out.firstChild,
    props = out[ATTR_KEY],
    vnodeChild = vnode.children;

  if (!props) {
    props = out[ATTR_KEY] = {};
    const attributes = out.attributes;
    for (let i = attributes.length; i--;) {
      props[attributes[i].name] = attributes[i].value;
    }
  }

  if (vnodeChild.length === 1 && isString(vnodeChild[0]) && fc.splitText !== undefined && !fc.nextSibling) {
    fc.nodeValue = vnodeChild[0];
  } else if (vnodeChild.length || fc) {
    innerDiffNode(vnodeChild, out, mountAll, componetRef, context);
  }
  diffAttributes(out,props, vnode.attributes);

}


function diffAttributes(dom, preAttr, attr) {
  for (const name in preAttr) {
    if (preAttr.hasOwnProperty(name)) {
      if (!attr[name]) {
        setAttribute(dom, name, preAttr[name], undefined);
      }
    }
  }

  for (const name in attr) {
    if (preAttr.hasOwnProperty(name) && name !== 'innerHTML' && name !== 'children') {//FIXME:写到这里，这里后面还有要写的
      setAttribute(dom, name, preAttr[name], attr[name]);
    }
  }
}

function setAttribute(dom, name, oldVal, val) {

}

function innerDiffNode(vnodeChild, dom, mountAll, componetRef, context) {
  let keyObj = {},
    noKeyLen = 0,
    domChilds = dom.childrenNodes,
    noKeyObj = {},
    min = 0,
    child = null;
  vnodeChildLen = vnodeChild.length;//用于循环vnodeChild计数

  for (const domChild of domChilds) {
    const props = domChild[ATTR_KEY];
    const key = props[key] ? props[key] : domChild._component ? domChild._component.__key : null;
    if (key) {
      keyObj[key] = domChild;
    } else {
      noKeyObj[noKeyLen++] = children;
    }
  }

  for (let i = 0; i < vnodeChildLen; i++) {
    const vChild = vnodeChild[i],
      key = vChild.key;
    child = null;
    if (key) {
      const keyChild = keyObj[key];
      if (keyChild) {
        child = keyChild;
        delete keyObj[key];
      }
    } else if (min < noKeyLen) {
      for (let j = min; j < noKeyLen; j++) {
        if (isSameType(noKeyObj[j], vChild)) {
          child = noKeyObj[j];
          delete noKeyObj[j];
          if (min === j) {
            min++;
          }
          if (j === noKeyLen) {
            noKeyLen--;
          }
        }
      }
    }

    child = diff(vChild, child, mountAll, componetRef, context)

    const c = domChilds[i]
    if (child && child !== c && child !== dom) {
      if (!c) {
        dom.appendChild(c);
      } else if (c.nextSibling === child) {
        removeNode(c);//FIXME:这里可以不用删除c，个人认为将child放到c前面就可以了
      } else {
        dom.insertBefore(child, c);
      }
    }
    handleObjectNode(keyObj);
    handleObjectNode(noKeyObj);
  }


}



function isSameNode(dom, vnodeName) {
  return dom.nodeName.toLowerCase() === vnodeName.toLowerCase();
}


function createNode(nodeName) {
  return document.createElement(nodeName);
}


function isSameType(node, vnode) {
  if (isString(vnode) || isNumber(vnode)) {
    return node.splitText !== undefined;
  } else if (isString(node.nodeName)) {
    return !node._componentConstructor && isSameNode(node, vnode.nodeName);
  }
  return node._componentConstructor === vnode.nodeName;
}

function handleObjectNode(ObjectNode) {
  let node;
  for (const key in ObjectNode) {
    if (ObjectNode.hasOwnProperty(key) && (node = ObjectNode[key])) {
      handleNode(node);
    }
  }
}

