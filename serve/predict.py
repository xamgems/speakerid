import pyaudio

from functools import reduce
from itertools import zip_longest

import wave
import numpy as np
from features import mfcc
from sklearn import mixture
import scipy.io.wavfile as wav

GMM_CLUSTERS = 6

def play(wav_filename):
    wav_info = wave.open(wav_filename, 'r')
    rate, data = wav.read(wav_filename, 'r')
    p = pyaudio.PyAudio()
    astream = p.open(format=p.get_format_from_width(wav_info.getsampwidth()),
        channels=wav_info.getnchannels(),
        rate=rate,
        output=True)

    wav_info.close()
    wav_chunks = grouper(data, 1024, np.uint8(0))

    for frames in wav_chunks:
        wav_bytes = reduce(lambda x, y: x + y, [f.tostring() for f in frames])
        astream.write(wav_bytes)

    astream.stop_stream()
    astream.close()

def speaker_distribution(wav_filename, speakers, models):
    rate, signal = wav.read(wav_filename, 'r')
    feats = mfcc(signal, rate, winlen=0.1)
    counts = [0] * len(speakers)
    for f in feats:
        lls = [likelihood(f, m) for m in models]
        probs = [ll/sum(lls) for ll in lls]
        max_probs = max(enumerate(probs), key=lambda x: x[1])
        counts[max_probs[0]] += 1

    probs = [{'id':speaker.decode('utf-8'), 'count':c/sum(counts)} for (speaker, c) in zip(speakers, counts)]
    return probs

def likelihood(x, model):
    priors = model.weights_
    mus = model.means_
    sigmas = model.covars_
    return sum([p * mv_gaussian_pdf(x, m, s) for p, m, s in zip(priors, mus, sigmas)])

# Computes the multivariate gaussian of an array-like x. sigma is a 1D array which represents the
# diagonals of a matrix.
def mv_gaussian_pdf(x, mu, sigma):
    size = len(x)
    det = reduce(lambda x, y: x * y, sigma)
    sigma = np.diag(sigma)

    norm_const = 1.0 / (pow((2*np.pi),float(size)/2) * pow(det,1.0/2))
    x_mu = np.matrix(x - mu)
    inv = np.linalg.inv(sigma)
    exp_const = np.power(np.e, -0.5 * (x_mu * inv * x_mu.T))
    return norm_const * exp_const

def grouper(iterable, n, fillvalue=None):
    args = [iter(iterable)] * n
    return zip_longest(fillvalue=fillvalue, *args)

def learn(wav_filename, old_data=None):
    rate, signal = wav.read(wav_filename, 'r')
    mfcc_feat = mfcc(signal, rate)
    if not old_data == None:
        mfcc_feat = np.concatenate((mfcc_feat, old_data))

    gmm = mixture.GMM(GMM_CLUSTERS)
    gmm.fit(mfcc_feat)
    return gmm, mfcc_feat
