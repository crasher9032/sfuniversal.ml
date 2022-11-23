try{
      fetch(
        "https://crm.eluniversal.com.mx:8443/ServicesSuscripciones2/Suscripciones/PagoElectronico",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJTdXNjcmlwY2lvbmVzIERpZ2l0YWxlcyIsInN1YiI6InN1c2NyaXBjaW9uZXNAZWx1bml2ZXJzYWwuY29tLm14IiwiaWF0IjoxNjY2NjMxODI5LCJleHAiOjE2NjY2ODE4MjksIlJvbGVzIjpbIkVYVCJdfQ.aubZ20pV3kqB_zTuSt-y37RLMcPCm3Eu5N-ndsV2-pFs0Bamg-cBAPXlJp6eX_Y7lN_r9zn9a9U9M8d3Y_7ehA"
          },
          body: JSON.stringify({
            
              "beneficiario":"s2609 f",
              "email":"s2609f@gmail.com",
              "telefono":"5557091313",
              "tarjeta":"4242424242424242",
              "cvv":123,
              "vigencia":"22",
              "vigenciames":"12",
              "importe":"123.00",
              "conceptopago":"suscripcion mensual digital",
              "referenciaorden":"SFAEFRA3FASDFAWEF",
              "referenciaproducto":"TM9QOHZMZAJ0",
              "referenciapago":"asfQADDF23ASFQr24fas",
              "moneda":"MXN",
              
              "empresa":"El Universal",
              "areapago":"Suscripciones",
              "formapago":"T"
              
          }),
        }
      )
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
          localStorage.setItem("token", data.accessToken);
        });
}catch(e) {
    console.log(e);
};
