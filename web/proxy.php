<?php
# This HOST global constant should also include port number if there is one.
#define('HOST', 'http://128.208.7.52'); 
$HOST = "192.168.8.108";
ini_set('reporting_errors', 1);
error_reporting(E_ALL);

if ($_SERVER["REQUEST_METHOD"] != "POST") {
  http_error(400, "Request method has to be POST");
}

if (isset($_POST["request"])) {
  $r = $_POST["request"];
  if (strcmp($r, "get") == 0) {
    $dest = $HOST . "/get_speakers";
    $req = curl_init($dest);
    curl_setopt($req, CURLOPT_HTTPGET, true);
  
  } else if (strcmp($r, "predict") == 0) {
    $dest = $HOST . "/predict";
    #$local = "/test1.wav";
    #file_put_content($local, file_get_content($_POST["wav"]));
    #$input = fopen('VIReS.html', 'r');  
    #$header = array('Content-Type: multipart/form-data');
    $req = curl_init($dest);
    curl_setopt($req, CURLOPT_POST, true);
    #curl_setopt($req, CURLOPT_HTTPHEADER, $header);
    #curl_setopt($req, CURLOPT_BINARYTRANSFER, true);
    #curl_setopt($req, CURLOPT_INFILESIZE, $_POST["size"]);
    #curl_setopt($req, CURLOPT_INFILE, $_POST['wav']);
    curl_setopt($req, CURLOPT_SAFE_UPLOAD, true);
    move_uploaded_file($_FILES['wav']['tmp_name'], "C:\\wamp\\www\\web\\" . $_POST["name"]);

    $file = new CURLFile( "C:\\wamp\\www\\web\\" . $_POST["name"],'audio/wav', "fuckyou.wav");
    curl_setopt($req, CURLOPT_POSTFIELDS, array('wav_sample' => $file));
 
  } else if (strcmp($r, "new") == 0) {
    $dest = $HOST . "/new_speaker";
    $req = curl_init($dest);
    curl_setopt($req, CURLOPT_POST, true);
    curl_setopt($req, CURLOPT_POSTFIELDS, array('name' => $_POST["name"]));
  
  } else if (strcmp($r, "learn") == 0) {
    $dest = $HOST . "/learn_speaker";
    $req = curl_init($dest);
    curl_setopt($req, CURLOPT_POST, true);
    //curl_setopt($req, CURLOPT_POSTFIELDS, array('wav' => $_POST["wav"], 'id' => $_POST["id"]));

    curl_setopt($req, CURLOPT_SAFE_UPLOAD, true);
    move_uploaded_file($_FILES['wav']['tmp_name'], "C:\\wamp\\www\\web\\" . $_POST["name"]);

    $file = new CURLFile( "C:\\wamp\\www\\web\\" . $_POST["name"],'audio/wav', "fuckyou.wav");
    curl_setopt($req, CURLOPT_POSTFIELDS, array('wav_sample' => $file, 'id' => $_POST["id"]));

  }

  curl_setopt($req, CURLOPT_RETURNTRANSFER, true);
  $returnVal = curl_exec($req);
  curl_close($req);
  
}
?><?= $_FILES["wav"]['tmp_name'] ?><?= $returnVal ?><?php
echo getcwd();
#print $file.getFilename();

function http_error($code, $message = "") {
    $code = (int) $code;
    $MESSAGES = array(
        400 => "Invalid request",
        403 => "Forbidden",
        404 => "File not found",
        500 => "Internal server error"
    );

    $error = "HTTP/1.1 $code ";
    if (isset($MESSAGES[$code])) {
        $error .= htmlspecialchars($MESSAGES[$code]);
    }
    if ($message) {
        $error .= " - " . htmlspecialchars($message);
    }
    header($error);
    die("Error: $error\n");
}
?>
