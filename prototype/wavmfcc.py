from features import mfcc
from features import logfbank
from sklearn import decomposition
import scipy.io.wavfile as wav
import glob
import os

def create_ceptrum_file(filename, feat):
	file = open(filename, "w")
	file.write(str(len(feat)) + " ")
	file.write(str(len(feat[0])) + "\n")

	for row in feat:
		file.write(" ".join([str(elem) for elem in row]) + "\n")

os.chdir("wav")
for file in glob.glob("*.wav"):
	print(file)

	file_no_ext = file.split('.')
	print(file_no_ext[0])


	mfcc_file_name = file_no_ext[0] + ".mfcc"
	fbank_file_name = file_no_ext[0] + ".fbank"
	pca_file_name = file_no_ext[0] + ".pca"

	#mfcc_file = open(mfcc_file_name, "w")
	#fbank_file = open(fbank_file_name, "w")

	(rate,sig) = wav.read(file)

	mfcc_feat = mfcc(sig,rate)
	create_ceptrum_file(mfcc_file_name, mfcc_feat)

	#pca = decomposition.PCA()
	pca = decomposition.PCA(n_components=3)
	pca_reduced = pca.fit_transform(mfcc_feat)
	create_ceptrum_file(pca_file_name, pca_reduced)



	#print(" ".join(str(sigma) for sigma in cluster_sigmas[ci]), file=model_file)
	#mfcc_file.write("helloworld")

	fbank_feat = logfbank(sig,rate)
	create_ceptrum_file(fbank_file_name, fbank_feat)

	'''fbank_file.write(str(len(fbank_feat)) + " ")
	fbank_file.write(str(len(fbank_feat[0])) + "\n")

	for row in fbank_feat:
		fbank_file.write(" ".join([str(elem) for elem in row]) + "\n")

	'''

	#print fbank_feat[1:3,:]
	#print len(fbank_feat)
	#print len(mfcc_feat)


	#print fbank_feat[0]

	#print len(mfcc_feat[1])




