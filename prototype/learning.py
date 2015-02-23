import sys
import numpy as np
import random
from functools import reduce
from sklearn import mixture
from matplotlib import pyplot as plt

SIGMA_FRACTION = 0.5
TRAIN_SPLIT = 0.70

def main():
    if len(sys.argv) != 3:
        print("Usage: learning <# of cluster> <data file>")
        sys.exit(1)
    # Collect command line arguments
    num_clusters = int(sys.argv[1])
    data_file_name = sys.argv[2]

    # Reads first line of data file into the number of features and examples
    data_file_lines = open(data_file_name).read().splitlines()
    num_examples, num_features = (int(n) for n in data_file_lines[0].split())
    data_file_lines.pop(0)

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

    train = datas[:round(TRAIN_SPLIT*len(datas))]
    test = datas[round(TRAIN_SPLIT*len(datas)):]

    print("Training from 0 to", round(TRAIN_SPLIT*len(datas)), "testing from", round(TRAIN_SPLIT*len(datas)), "to", len(datas))

    iters = range(round(0.06*len(train)), len(train), 500)
    train_scores = []
    test_scores = []
    for i in iters:
        print("Traning over", i, "data points.")
        curr_train = train[:i]
        gmm = mixture.GMM(num_clusters)
        gmm.fit(curr_train)
        train_score = np.mean(gmm.score(curr_train))
        test_score = np.mean(gmm.score(test))
        train_scores.append(train_score)
        test_scores.append(test_score)

    gmm = mixture.GMM(num_clusters)
    gmm.fit(datas)
    plt.plot(iters, train_scores, linewidth=2, color="#03a9f4", label="Test")
    plt.plot(iters, test_scores, linewidth=2, color="#e84e40", label="Train")
    plt.legend()
    plt.show(block=True)

# Preforms the expectation step by computing the membership weights of each data point over each
# cluster. The weights matrix returned is indexed by weights[cluster_i][data_i]
def expectation(datas, cluster_mus, cluster_sigmas, cluster_priors):
    num_clusters = len(cluster_priors)
    weights = np.zeros((num_clusters, len(datas)))

    for ci in range(num_clusters):
        for di in range(len(datas)):
            # Logs used to avoid underflow
            pk = np.log(mv_gaussian_pdf(datas[di], cluster_mus[ci], cluster_sigmas[ci]))
            denom = reduce(np.logaddexp, (np.log(mv_gaussian_pdf(datas[di], cluster_mus[cj], cluster_sigmas[cj])) + np.log(cluster_priors[cj]) for cj in range(num_clusters)))
            weight = (pk + np.log(cluster_priors[ci])) - denom
            weights[ci][di] = np.exp(np.matrix.item(weight))

    return weights

def log_likelihood(datas, cluster_mus, cluster_sigmas, cluster_priors):
    total = 0
    for d in datas:
        data_p = 0
        for mu, sigma, prior in zip(cluster_mus, cluster_sigmas, cluster_priors):
            data_p = prior * mv_gaussian_pdf(d, mu, sigma)
        total += np.log(data_p)
    return total

def maximization(datas, weights, num_clusters):
    # Approximation of number of data points assigned to each cluster
    cluster_assigns = [sum(cluster_weight) for cluster_weight in weights]
    cluster_priors = [n/len(datas) for n in cluster_assigns]

    cluster_mus = [sum_parts([weights[ci][di] * np.array(d) for di, d in enumerate(datas)],
                          cluster_assigns[ci])
                   for ci in range(num_clusters)]
    cluster_sigmas = [sum_parts([weights[ci][di] * (np.array(d) - cluster_mus[ci])**2 for di, d in enumerate(datas)],
                                cluster_assigns[ci])
                      for ci in range(num_clusters)]

    return cluster_mus, cluster_sigmas, cluster_priors

def sum_parts(parts, assigns):
    return (1.0 / assigns) * np.sum(parts, axis=0)

def log_likelihood(datas, cluster_mus, cluster_sigmas, cluster_priors):
    total = 0
    for d in datas:
        data_p = 0
        for mu, sigma, prior in zip(cluster_mus, cluster_sigmas, cluster_priors):
            data_p = prior * mv_gaussian_pdf(d, mu, sigma)
        total += np.log(data_p)
    return total
    
# Initialize mu, sigma and priors for each cluster
def init_parameters(mins, maxs, num_clusters):
    # Random initialization version 1 - Choose random number from range of each dimension for mu of 
    # multivariate. Repeat this for each cluster.
    cluster_mus = [np.array([random.uniform(min_n, max_n) for max_n, min_n in zip(maxs, mins)])
                   for c in range(num_clusters)]

    # Initalize sigmas to be a fixed fraction of the range of each dimension
    data_ranges = [abs(max_n - min_n) for max_n, min_n in zip(maxs, mins)]
    cluster_sigmas = [[SIGMA_FRACTION * r for r in data_ranges] for i in range(num_clusters)]

    # Initialize cluster priors over the uniform distribution
    cluster_priors = [[1.0/num_clusters] for i in range(num_clusters)]

    return cluster_mus, cluster_sigmas, cluster_priors

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
    
if __name__ == "__main__":
    main()
