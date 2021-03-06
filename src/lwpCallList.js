"use strict";

import lwpUtils from "./lwpUtils";
import lwpRenderer from "./lwpRenderer";
import lwpCall from "./lwpCall";

export default class extends lwpRenderer {
  constructor(libwebphone, config = {}) {
    super(libwebphone);
    this._libwebphone = libwebphone;
    this._emit = this._libwebphone._callListEvent;
    this._initProperties(config);
    this._initInternationalization(config.i18n || {});
    this._initEventBindings();
    this._initRenderTargets();
    this._emit("created", this);
    return this;
  }

  getCalls() {
    return this._calls;
  }

  getCall(callId = null) {
    return this._calls.find((call) => {
      if (callId) {
        return call.getId() == callId;
      } else {
        return call.isPrimary() && call.hasSession();
      }
    });
  }

  addCall(newCall) {
    const previousCall = this.getCall();

    if (previousCall && !previousCall.isOnHold()) {
      this._calls.push(newCall);
      this._emit("calls.added", this, newCall);
    } else {
      this._calls.map((call) => {
        if (call.isPrimary) {
          call._clearPrimary();
        }
      });

      this._calls.push(newCall);
      this._emit("calls.added", this, newCall);

      newCall._setPrimary();
      this._emit("calls.changed", this, newCall, previousCall);
    }
  }

  switchCall(callId) {
    const previousCall = this.getCall();
    const primaryCall = this.getCall(callId);

    this._calls.map((call) => {
      if (call.isPrimary) {
        call._clearPrimary();
      }
    });

    if (primaryCall) {
      primaryCall._setPrimary();
      if (primaryCall.hasSession()) {
        this._emit("calls.changed", this, primaryCall, previousCall);
      } else {
        this._emit("calls.changed", this, null, previousCall);
      }
    }
  }

  removeCall(terminatedCall) {
    const terminatedId = terminatedCall.getId();

    this._calls = this._calls.filter((call) => {
      return call.getId() != terminatedId;
    });
    this._emit("calls.removed", this, terminatedCall);

    if (terminatedCall.isPrimary()) {
      const withSession = this._calls.find((call) => {
        return call.hasSession();
      });

      if (withSession) {
        withSession._setPrimary(false);
        this._emit("calls.changed", this, withSession, terminatedCall);
      } else {
        if (this._calls.length > 0) {
          this._calls[0]._setPrimary();
          this._emit("calls.changed", this, null, terminatedCall);
        }
      }

      terminatedCall._clearPrimary(false);
    }
  }

  updateRenders() {
    this.render((render) => {
      render.data = this._renderData(render.data);
      return render;
    });
  }

  /** Init functions */

  _initInternationalization(config) {
    const defaults = {
      en: {
        new: "New Call",
      },
    };
    const resourceBundles = lwpUtils.merge(
      defaults,
      config.resourceBundles || {}
    );
    this._libwebphone.i18nAddResourceBundles("callList", resourceBundles);
  }

  _initProperties(config) {
    const defaults = {
      renderTargets: [],
    };
    this._config = lwpUtils.merge(defaults, config);

    const newCall = new lwpCall(this._libwebphone);
    newCall._setPrimary();
    this._calls = [newCall];
  }

  _initEventBindings() {
    this._libwebphone.on("call.created", (lwp, call) => {
      this.addCall(call);
    });
    this._libwebphone.on("call.terminated", (lwp, call) => {
      this.removeCall(call);
    });

    this._libwebphone.on("calllist.calls.added", () => {
      this.updateRenders();
    });
    this._libwebphone.on("callList.calls.changed", () => {
      this.updateRenders();
    });

    /** TODO: make all these call.pimary.* when we don't need the debugging info */
    this._libwebphone.on("call.promoted", () => {
      this.updateRenders();
    });

    this._libwebphone.on("call.progress", () => {
      this.updateRenders();
    });
    this._libwebphone.on("call.established", () => {
      this.updateRenders();
    });

    this._libwebphone.on("call.hold", () => {
      this.updateRenders();
    });
    this._libwebphone.on("call.unhold", () => {
      this.updateRenders();
    });
    this._libwebphone.on("call.muted", () => {
      this.updateRenders();
    });
    this._libwebphone.on("call.unmuted", () => {
      this.updateRenders();
    });
    this._libwebphone.on("call.transfer.collecting", () => {
      this.updateRenders();
    });
    this._libwebphone.on("call.transfer.completed", () => {
      this.updateRenders();
    });

    this._libwebphone.on("call.ended", () => {
      this.updateRenders();
    });
    this._libwebphone.on("call.failed", () => {
      this.updateRenders();
    });
  }

  _initRenderTargets() {
    this._config.renderTargets.map((renderTarget) => {
      return this.renderAddTarget(renderTarget);
    });
  }

  /** Render Helpers */

  _renderDefaultConfig() {
    return {
      template: this._renderDefaultTemplate(),
      i18n: {
        new: "libwebphone:callList.new",
      },
      data: lwpUtils.merge({}, this._config, this._renderData()),
      by_name: {
        calls: {
          events: {
            onclick: (event) => {
              const element = event.srcElement;
              const callid = element.value;
              this.switchCall(callid);
            },
          },
        },
      },
    };
  }

  _renderDefaultTemplate() {
    return `
      {{#data.calls}}

      {{^hasSession}}
        {{#primary}}
          <input type="radio" id="{{by_name.calls.elementName}}{{callId}}" name="{{by_name.calls.elementName}}" value="{{callId}}" checked="checked">
          <label for="{{by_name.calls.elementName}}{{callId}}">{{i18n.new}}</label>
        {{/primary}}

        {{^primary}}
          <input type="radio" id="{{by_name.calls.elementName}}{{callId}}" name="{{by_name.calls.elementName}}" value="{{callId}}">
          <label for="{{by_name.calls.elementName}}{{callId}}">{{i18n.new}}</label>
        {{/primary}}
      {{/hasSession}}

      {{#hasSession}}
        {{#primary}}
        <input type="radio" id="{{by_name.calls.elementName}}{{callId}}"  name="{{by_name.calls.elementName}}" value="{{callId}}" checked="checked">
        {{/primary}}

        {{^primary}}
        <input type="radio" id="{{by_name.calls.elementName}}{{callId}}"  name="{{by_name.calls.elementName}}" value="{{callId}}">
        {{/primary}}

        <label for="{{by_name.calls.elementName}}{{callId}}">{{remoteIdentity}}
          <ul>
            <li>call id: {{callId}}</li>
            <li>primary: {{primary}}</li>
            <li>progress: {{progress}}</li>
            <li>established: {{established}}</li>
            <li>held: {{held}}</li>
            <li>muted: {{muted}}</li>
            <li>inTransfer: {{inTransfer}}</li>
            <li>ended: {{ended}}</li>
            <li>direction: {{direction}}</li>
          </ul>
        </label>
      {{/hasSession}}
      {{/data.calls}}


    `;
  }

  _renderData(data = {}) {
    data.calls = this.getCalls().map((call) => {
      return call.summary();
    });

    data.primary = this.getCall();

    return data;
  }

  /** Helper functions */
}
