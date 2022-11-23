(function($){

    $(document).ready(function () {
        function assertion(options, callback) {
            //crear identidad
            function getRandomString(length) {
                var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                var charLength = chars.length;
                var result = '';
                for ( var i = 0; i < length; i++ ) {
                   result += chars.charAt(Math.floor(Math.random() * charLength));
                }
                return result;
            }
            var jsonData = {
                "botName": options.botInfo.chatBot,
                "clientId": options.clientId,
                "clientSecret": options.clientSecret,
                "identity": getRandomString(20),
                "aud": "",
                "isAnonymous": false
            };
            console.log(jsonData);
            $.ajax({
                url: options.JWTUrl,
                type: 'post',
                data: jsonData,
                dataType: 'json',
                success: function (data) {
                    console.log(data.jwt);
                    options.assertion = data.jwt;
                    options.handleError = koreBot.showError;
                    options.chatHistory = koreBot.chatHistory;
                    options.botDetails = koreBot.botDetails;
                    callback(null, options);
                    setTimeout(function () {
                        if (koreBot && koreBot.initToken) {
                            koreBot.initToken(options);
                        }
                    }, 2000);
                },
                error: function (err) {
                    koreBot.showError(err.responseText);
                }
            });
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