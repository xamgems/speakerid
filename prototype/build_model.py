import sys
import numpy as np
import random
from functools import reduce
from sklearn import mixture
from matplotlib import pyplot as plt
import pickle

SIGMA_FRACTION = 0.5
TRAIN_SPLIT = 1

def main():
    if len(sys.argv) != 4:
        print("Usage: ./build_model <# of cluster> <data file> <model file>")
        sys.exit(1)

    # Collect command line arguments
    num_clusters = int(sys.argv[1])
    data_file_name = sys.argv[2]
    model_file_name = sys.argv[3]

    # Reads first line of data file into the number of features and examples
    data_file_lines = open(data_file_name).read().splitlines()
    num_examples, num_features = (int(n) for n in data_file_lines[0].split())
    data_file_lines.pop(0)

    # Opens output file for writing distribution information
    model_file = open(model_file_name, "wb")
        
    # Mins stores the minimum of the range of each dimension of the data vector
    mins = [float("inf")] * num_features
    # Maxs stores the maximum of the range of each dimension of the data vector
    maxs = [float("-inf")] * num_features

    datas = []
    # Build a matrix that represents each example vector and find the maximum and minimum for
    # column.
    for line in data_file_lines:
        data = np.array([float(n) for n in line.split()])
        datas.append(data)

    datas = datas[:round(TRAIN_SPLIT*len(datas))]        
    gmm = mixture.GMM(num_clusters)
    gmm.fit(datas)

    # Print model to file
    pickle.dump(gmm, model_file)
    
if __name__=="__main__":
    main()
