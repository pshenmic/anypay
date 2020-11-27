import Ember from 'ember';
import { inject as service } from '@ember/service'
import $ from 'jquery'

export default Ember.Controller.extend({
  addressSearch: service('address-search'),
  search: null,
  selectedMerchant: null,
  selectedMerchantCoins: [],

  actions: {
    closeModal() {
      $('.business-modal').addClass('close')
      this.set('selectedMerchant', null)
      this.set('selectedMerchantDetails', null)
    },

    async searchLocation(query) {

      let results = await this.get('addressSearch').getCoordinates(this.get('search'))

      console.log('addressSearchResults' , results)

      this.get('googlemap').setCenter({
        lat: parseFloat(results.lat),
        lng: parseFloat(results.lng)
      })

    },

    async merchantDetailsClicked(details)  {
      this.set('selectedMerchant', details)

      $('.business-modal').removeClass('close')

      let resp = await $.getJSON(`http://localhost:8000/accounts/${details.id}`)
      console.log(resp)

      this.set('selectedMerchantDetails', resp)
      this.set('selectedMerchantCoins', resp.coins.join(', '))

      /*
      console.log('merchant details clicked', details)
      if (details.stub) {
        window.location = `https://app.anypayinc.com/pay/${details.stub}`
      }

      this.get('googlemap').setCenter({
        lat: parseFloat(details.latitude),
        lng: parseFloat(details.longitude)
      })
      */

    },

    showDetails(location) {

      console.log('show details', location);

      this.set('location', location)

    }
  }
});
