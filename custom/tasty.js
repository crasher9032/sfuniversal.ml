function getRandomString(length) {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charLength = chars.length;
    var result = '';
    for ( var i = 0; i < length; i++ ) {
       result += chars.charAt(Math.floor(Math.random() * charLength));
    }
    return result;
}

console.log(getRandomString(20));

function extract(originalString){
    var stringCut = originalString.substring(
        originalString.indexOf(":") + 1, 
        originalString.lastIndexOf(":")
    );
    return stringCut;
}

let dato = extract("completed:trh9yjltojlbsxmppzph:Suscripcion");
console.log(dato);