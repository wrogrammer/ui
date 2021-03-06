import EmberObject from '@ember/object';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { get, set, setProperties } from '@ember/object';
import { randomStr } from 'shared/utils/util';

export default Route.extend({
  modalService: service('modal'),
  catalog:      service(),
  scope:        service(),
  clusterStore: service(),
  store:        service(),
  globalStore:  service(),

  parentRoute:  'multi-cluster-apps.catalog',

  model(params/* , transition*/) {
    var store = get(this, 'globalStore');

    var dependencies = {
      tpl:        get(this, 'catalog').fetchTemplate(params.template),
      projects:   this.scope.getAllProjects(),
      clusters:   this.scope.getAllClusters(),
    };

    if ( params.upgrade ) {
      dependencies.upgrade = get(this, 'catalog').fetchTemplate(`${ params.template }-${ params.upgrade }`, true);
    }

    if (params.appId) {
      dependencies.app = store.find('multiclusterapp', params.appId);
    }

    return hash(dependencies, 'Load dependencies').then((results) => {
      let kind = 'helm';
      let neuApp = null;
      var links;

      // get diff versions
      links = results.tpl.versionLinks;

      var verArr = Object.keys(links).filter((key) => !!links[key])
        .map((key) => ({
          version:     key,
          sortVersion: key,
          link:        links[key]
        }));

      if (results.app) {
        if (get(params, 'clone')) {
          neuApp = results.app.cloneForNew();

          set(neuApp, 'name', this.dedupeName(results.app.name));
        } else {
          neuApp = results.app;
        }
      } else {
        neuApp = store.createRecord({
          type:      'multiclusterapp',
          answers:   [],
          catalogId: results.tpl.catalogId,
          targets:   [],
          members:   [],
        });
      }

      if ( neuApp.id ) {
        verArr.filter((ver) => ver.version === get(neuApp, 'externalIdInfo.version'))
          .forEach((ver) => {
            set(ver, 'version', `${ ver.version } (current)`);
          })
      }

      return EmberObject.create({
        allTemplates:    this.modelFor(get(this, 'parentRoute')).get('catalog'),
        multiClusterApp: neuApp,
        projects:        results.projects,
        clusters:        results.clusters,
        tpl:             results.tpl,
        tplKind:         kind,
        upgradeTemplate: results.upgrade,
        versionLinks:    links,
        versionsArray:   verArr,
      });
    });
  },

  resetController(controller, isExiting/* , transition*/) {
    if (isExiting) {
      setProperties(controller, {
        appId:       null,
        catalog:     null,
        template:    null,
        upgrade:     null,
        clone:       null,
      });
    }
  },

  dedupeName(name) {
    const suffix = randomStr(5, 'novowels');
    let newName  = null;

    newName = `${ name }-${ suffix }`;

    return newName;
  },
});
