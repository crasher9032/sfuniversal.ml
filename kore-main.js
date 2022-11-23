(function($){

    $(document).ready(function () {
        // function assertion(options, callback) {
        //     var jsonData = {
        //         "clientId": options.clientId,
        //         "clientSecret": options.clientSecret,
        //         "identity": options.userIdentity,
        //         "aud": "",
        //         "isAnonymous": false
        //     };
        //     $.ajax({
        //         url: options.JWTUrl,
        //         type: 'post',
        //         data: jsonData,
        //         dataType: 'json',
        //         success: function (data) {
        //             options.assertion = data.jwt;
        //             options.handleError = koreBot.showError;
        //             options.chatHistory = koreBot.chatHistory;
        //             options.botDetails = koreBot.botDetails;
        //             callback(null, options);
        //             setTimeout(function () {
        //                 if (koreBot && koreBot.initToken) {
        //                     koreBot.initToken(options);
        //                 }
        //             }, 2000);
        //         },
        //         error: function (err) {
        //             koreBot.showError(err.responseText);
        //         }
        //     });
        // }
        function assertion(options, callback) {
            var korecookie = localStorage.getItem("korecom");
            var uuid = (korecookie) || koreGenerateUUID();
            console.log(options);
            console.log("UUID: ",uuid);
            localStorage.setItem("korecom", uuid);
            var time_now = Math.floor(new Date().getTime() / 1000)
            var exp = time_now + 60 * 60 * 24
            var jsonData = {
                "iat": time_now,
                "exp": exp,
                "aud": "https://idproxy.kore.com/authorize",
                "iss": options.clientId,
                "sub": uuid,
                "isAnonymous": "true"
            }
            options.assertion = generateJWT(jsonData, options.clientSecret)
            console.log(options.assertion)
            callback(null, options);
        }
        var chatConfig=window.KoreSDK.chatConfig;
        chatConfig.botOptions.assertionFn=assertion;
        
        var koreBot = koreBotChat();
        koreBot.show(chatConfig);
        $('.openChatWindow').click(function () {
            koreBot.show(chatConfig);
        });
    });

})(jQuery || (window.KoreSDK && window.KoreSDK.dependencies && window.KoreSDK.dependencies.jQuery));