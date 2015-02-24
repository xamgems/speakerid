<?php
# This HOST global constant should also include port number if there is one.
define('HOST', ''); 

ini_set('reporting_errors', 1);
error_reporting(E_ALL);

if ($_SERVER["REQUEST_METHOD"] != "POST") {
  http_error(400, "Request method has to be POST");
}

if (isset($_POST["request"])) {
  $r = $_POST["request"];
#$dest = "";
  if (strcmp($r, "get") == 0) {
    $dest = $HOST . "/get_speakers";
    $req = curl_init($dest);
  } else if (strcmp($r, "predict") == 0) {
    $dest = $HOST . "/predict";
    $req = curl_init($dest);
    curl_setopt($req, CURLOPT_POSTFIELDS, array('wav' => $_POST["wav"]));
  } else if (strcmp($r, "new") == 0) {
    $dest = $HOST . "/new_speaker";
    $req = curl_init($dest);
    curl_setopt($req, CURLOPT_POSTFIELDS, array('wav' => $_POST["name"]));
  } else if (strcmp($r, "learn") == 0) {
    $dest = $HOST . "/learn_speaker";
    $req = curl_init($dest);
    curl_setopt($req, CURLOPT_POSTFIELDS, array('wav' => $_POST["wav"], 'id' => $_POST["id"]));

  }

  curl_setopt($req, CURLOPT_RETURNTRANSFER, true);
  $returnVal = curl_exec($req);
  curl_close($req);
  
}
?>

<?= $returnVal ?>

<?php

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
