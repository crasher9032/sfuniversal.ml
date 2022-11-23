try{
    debugger
      fetch(
        "https://crm.eluniversal.com.mx:8443/ServicesSuscripciones2/authenticate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userName: "suscripciones@eluniversal.com.mx",
            password: "test",
          }),
        }
      )
        .then((response) => response.json())
        .then((data) => {
          debugger;
          console.log(data);
          localStorage.setItem("token", data.accessToken);
        });
}catch(e) {
    console.log(e);
};
